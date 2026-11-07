-- Phase 7: token-based API usage limiting
-- Supabase Dashboard → SQL Editor → 이 파일 전부 → Run
--
-- 채점(OpenRouter)·번역(DeepL) API를 로그인만 하면 무제한으로 부를 수 있던 문제를 막는다.
-- 하루 단위로 리셋되는 quota가 아니라 지갑처럼 깎이는 토큰이다 — 나중에 결제를 붙이면
-- "충전" 하나만 얹으면 되도록 처음부터 이 구조로 짰다.

create table if not exists public.token_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.token_balances enable row level security;

drop policy if exists "token_balances_select_own" on public.token_balances;
create policy "token_balances_select_own"
  on public.token_balances
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 잔액 변동 내역(원장). 지급도 사용도 전부 한 줄씩 남긴다 — "왜 이렇게 됐는지" 나중에 볼 수 있게.
create table if not exists public.token_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists token_ledger_user_id_idx on public.token_ledger (user_id, created_at desc);

alter table public.token_ledger enable row level security;
-- 원장은 지금은 직접 조회를 열지 않는다. 필요해지면 admin RPC로 노출한다.

-- ── 신규 가입 시 초기 토큰 지급 ──────────────────────────────────

create or replace function public.grant_initial_tokens()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.token_balances (user_id, balance)
  values (new.id, 50)
  on conflict (user_id) do nothing;

  insert into public.token_ledger (user_id, delta, reason)
  values (new.id, 50, 'grant_initial');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_tokens on auth.users;
create trigger on_auth_user_created_grant_tokens
  after insert on auth.users
  for each row execute function public.grant_initial_tokens();

-- ── 토큰 사용 ─────────────────────────────────────────────────
--
-- 액션별 비용은 이 함수 안에서만 정한다 — 클라이언트가 액수를 불러주는 방식이면
-- 요청을 조작해서 원하는 만큼 깎게 만들 수 있다. 관리자는 잔액을 아예 건드리지 않는다
-- (무제한 — 개발/운영 중 막히지 않게).

create or replace function public.spend_tokens(p_action text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  cost int;
  new_balance int;
begin
  cost := case p_action
    when 'grade_writing' then 5
    when 'translate' then 1
    else null
  end;

  if cost is null then
    raise exception 'unknown action: %', p_action;
  end if;

  if public.is_admin() then
    return 999999;
  end if;

  update public.token_balances
  set balance = balance - cost, updated_at = now()
  where user_id = auth.uid() and balance >= cost
  returning balance into new_balance;

  if new_balance is null then
    raise exception 'insufficient_tokens';
  end if;

  insert into public.token_ledger (user_id, delta, reason)
  values (auth.uid(), -cost, p_action);

  return new_balance;
end;
$$;

revoke all on function public.spend_tokens(text) from public;
grant execute on function public.spend_tokens(text) to authenticated;

-- ── 관리자 충전 ───────────────────────────────────────────────

create or replace function public.admin_grant_tokens(target_id uuid, amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if amount = 0 then
    raise exception 'amount must not be zero';
  end if;

  insert into public.token_balances (user_id, balance)
  values (target_id, greatest(0, amount))
  on conflict (user_id) do update
    set balance = greatest(0, public.token_balances.balance + amount),
        updated_at = now()
  returning balance into new_balance;

  insert into public.token_ledger (user_id, delta, reason)
  values (target_id, amount, 'grant_admin');

  return new_balance;
end;
$$;

revoke all on function public.admin_grant_tokens(uuid, int) from public;
grant execute on function public.admin_grant_tokens(uuid, int) to authenticated;

-- ── 관리자 계정 목록에 잔액 포함 ─────────────────────────────────
--
-- 반환 컬럼이 늘어나므로 create or replace 전에 drop이 필요하다.

drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text,
  role text,
  target_university text,
  target_major text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  token_balance int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    coalesce(p.email, u.email)::text,
    p.display_name,
    p.avatar_url,
    p.role,
    p.target_university,
    p.target_major,
    p.created_at,
    u.last_sign_in_at,
    coalesce(tb.balance, 0)
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.token_balances tb on tb.user_id = p.id
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

-- ── 기존 계정에도 초기 토큰 소급 지급 ──────────────────────────
--
-- 트리거는 앞으로 가입할 사람한테만 적용된다. 이미 가입돼 있는 계정은 잔액이 없으므로
-- 한 번만 채워 준다(이미 지급받은 사람은 건드리지 않는다).

insert into public.token_balances (user_id, balance)
select id, 50 from auth.users
on conflict (user_id) do nothing;

insert into public.token_ledger (user_id, delta, reason)
select u.id, 50, 'grant_initial_backfill'
from auth.users u
where not exists (
  select 1 from public.token_ledger l where l.user_id = u.id
);

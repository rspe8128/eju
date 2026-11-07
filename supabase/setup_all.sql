-- EJU Study: Supabase 한 번에 세팅
-- Supabase Dashboard → SQL Editor → New query → 이 파일 내용 전부 → Run
--
-- 포함: profiles + 트리거 + avatars 버킷 / study_data + RLS / admin

-- ── Phase 1: profiles + avatars ─────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  target_university text,
  target_major text,
  exam_target_date date,
  email text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text;
update public.profiles set role = 'user' where role is null;
alter table public.profiles alter column role set default 'user';
alter table public.profiles alter column role set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'admin'));
  end if;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Phase 2: study_data sync ───────────────────────────────────

create table if not exists public.study_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  version bigint not null default 1,
  device_label text,
  updated_at timestamptz not null default now()
);

alter table public.study_data enable row level security;

drop policy if exists "study_data_select_own" on public.study_data;
create policy "study_data_select_own"
  on public.study_data
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "study_data_insert_own" on public.study_data;
create policy "study_data_insert_own"
  on public.study_data
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "study_data_update_own" on public.study_data;
create policy "study_data_update_own"
  on public.study_data
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "study_data_delete_own" on public.study_data;
create policy "study_data_delete_own"
  on public.study_data
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ── Phase 3: admin ─────────────────────────────────────────────

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email is distinct from u.email);

update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('marinekorea999@gmail.com');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is distinct from 'user' and not public.is_admin() then
      new.role := 'user';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'only admins can change roles';
    end if;
    if old.id = auth.uid() and old.role = 'admin' and new.role <> 'admin' then
      if (
        select count(*)::int
        from public.profiles
        where role = 'admin'
      ) <= 1 then
        raise exception 'cannot remove the last admin';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

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
  last_sign_in_at timestamptz
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
    u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_set_role(target_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if new_role not in ('user', 'admin') then
    raise exception 'invalid role';
  end if;

  if target_id = auth.uid() and new_role <> 'admin' then
    if (
      select count(*)::int
      from public.profiles
      where role = 'admin'
    ) <= 1 then
      raise exception 'cannot remove the last admin';
    end if;
  end if;

  update public.profiles
  set role = new_role,
      updated_at = now()
  where id = target_id;

  if not found then
    raise exception 'user not found';
  end if;
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

create or replace function public.admin_delete_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if target_id = auth.uid() then
    raise exception 'cannot delete yourself';
  end if;

  delete from auth.users
  where id = target_id;

  if not found then
    raise exception 'user not found';
  end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ── Phase 4: terms consent ─────────────────────────────────────

alter table public.profiles
  add column if not exists terms_agreed_at timestamptz;

-- ── Phase 5: error logging ──────────────────────────────────────

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  stack text,
  path text,
  context text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists error_logs_created_at_idx on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;

drop policy if exists "error_logs_insert_any" on public.error_logs;
create policy "error_logs_insert_any"
  on public.error_logs
  for insert
  to anon, authenticated
  with check (true);

create or replace function public.admin_list_errors(limit_count int default 200)
returns table (
  id uuid,
  user_email text,
  message text,
  stack text,
  path text,
  context text,
  user_agent text,
  created_at timestamptz
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
    e.id,
    u.email::text,
    e.message,
    e.stack,
    e.path,
    e.context,
    e.user_agent,
    e.created_at
  from public.error_logs e
  left join auth.users u on u.id = e.user_id
  order by e.created_at desc
  limit greatest(1, least(limit_count, 500));
end;
$$;

revoke all on function public.admin_list_errors(int) from public;
grant execute on function public.admin_list_errors(int) to authenticated;

create or replace function public.admin_clear_errors()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  delete from public.error_logs;
end;
$$;

revoke all on function public.admin_clear_errors() from public;
grant execute on function public.admin_clear_errors() to authenticated;

-- ── Phase 6: self-delete account ───────────────────────────────

create or replace function public.self_delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();

  if caller_role = 'admin' then
    if (
      select count(*)::int
      from public.profiles
      where role = 'admin'
    ) <= 1 then
      raise exception '관리자가 한 명뿐이라 탈퇴할 수 없습니다. 다른 계정을 관리자로 지정한 뒤 다시 시도하세요.';
    end if;
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.self_delete_account() from public;
grant execute on function public.self_delete_account() to authenticated;

-- ── Phase 7: token system ────────────────────────────────────────

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

create table if not exists public.token_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists token_ledger_user_id_idx on public.token_ledger (user_id, created_at desc);

alter table public.token_ledger enable row level security;

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

insert into public.token_balances (user_id, balance)
select id, 50 from auth.users
on conflict (user_id) do nothing;

insert into public.token_ledger (user_id, delta, reason)
select u.id, 50, 'grant_initial_backfill'
from auth.users u
where not exists (
  select 1 from public.token_ledger l where l.user_id = u.id
);

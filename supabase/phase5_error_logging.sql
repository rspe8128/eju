-- Phase 5: client error logging
-- Supabase Dashboard → SQL Editor → 이 파일 전부 → Run
--
-- 화면에서 안 잡힌 에러를 테이블에 남긴다. Vercel 무료 플랜엔 서버 로그가 따로
-- 없어서, 지금까지는 사용자가 말해주기 전엔 뭐가 깨졌는지 알 방법이 없었다.

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

-- 로그인 전 화면(/login 등)에서도 에러가 날 수 있으므로 익명도 남길 수 있게 한다.
-- 직접 읽기는 아무에게도 안 열어준다 — 조회는 아래 admin_list_errors로만.
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

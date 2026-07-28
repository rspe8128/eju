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

-- Phase 2: study data sync snapshot table

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

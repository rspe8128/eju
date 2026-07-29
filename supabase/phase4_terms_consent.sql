-- Phase 4: Terms / privacy consent timestamp
-- Supabase Dashboard → SQL Editor → 이 파일 전부 → Run

alter table public.profiles
  add column if not exists terms_agreed_at timestamptz;

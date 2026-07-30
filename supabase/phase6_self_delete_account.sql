-- Phase 6: self-service account deletion
-- Supabase Dashboard → SQL Editor → 이 파일 전부 → Run

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

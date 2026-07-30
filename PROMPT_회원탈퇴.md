# 커서에 줄 프롬프트 — 회원 탈퇴(자기 계정 삭제)

> 사용법: `---` 아래 코드블록만 그대로 복사해서 커서에 붙여넣을 것.

---

## 왜 필요한가

지금 "전체 초기화"(설정 화면)는 `study_data`(학습 기록)만 지우고 **계정·로그인 자격은 그대로 남긴다**.
개인정보처리방침에는 "삭제 요청은 문의 메일로 처리한다"고 적어 뒀는데, 실제로 스스로 탈퇴하는
화면은 없다. 이용자가 늘면 메일로 일일이 처리하기 부담스러워지고, 개인정보보호법상 삭제 요청권
자체는 메일로 받아도 되지만 자기 서비스 안에서 직접 처리 못 하는 건 좋지 않다.

`admin_delete_user`(관리자가 남을 지우는 함수)는 이미 있다. 이번엔 **본인이 자기 계정을 지우는**
별도 함수가 필요하다 — 관리자 권한 체크가 필요 없는 대신, "마지막 남은 관리자가 자기 자신을
지워서 관리자가 0명이 되는" 상황만 막으면 된다.

---

```
설정 화면(SettingsView.tsx)에 "회원 탈퇴" 기능을 추가해줘. "전체 초기화" 섹션 바로 아래,
같은 위험 스타일(붉은 테두리)로 넣되 별개의 섹션으로 — 초기화는 학습 기록만 지우고 계정은
남기고, 탈퇴는 로그인 자격 자체를 지우는 거라 훨씬 무겁다는 걸 문구로 분명히 구분해줘.

## 1. SQL — supabase/phase6_self_delete_account.sql 새로 만들 것

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

기존 admin_delete_user와 마찬가지로 auth.users를 지우면 profiles·study_data는
on delete cascade로 자동 삭제된다(이미 걸려 있는 FK). 이 SQL도 supabase/setup_all.sql
맨 끝에 같은 방식으로 이어 붙여줘(phase4, phase5가 어떻게 붙어 있는지 보고 그대로).

## 2. 타입 — src/lib/supabase/types.ts

Functions에 self_delete_account 추가:
  Args: Record<string, never>
  Returns: undefined
(admin_delete_user 타입 정의 바로 옆에 같은 형식으로)

## 3. UI — SettingsView.tsx

"전체 초기화" 섹션과 완전히 같은 패턴을 쓸 것:
- syncInfo.loggedIn 일 때만 보이는 섹션 (로그인 안 했으면 지울 계정이 없음)
- 처음엔 "회원 탈퇴…" 버튼만
- 누르면 경고 박스가 펼쳐지고:
  - "탈퇴하면 로그인 자격과 계정에 연결된 모든 서버 데이터(프로필, 학습 동기화 기록)가
    완전히 삭제되고, 다시 같은 Google 계정으로 로그인해도 새 계정으로 취급됩니다.
    되돌릴 수 없습니다." 같은 경고 문구
  - "탈퇴" 라고 직접 입력해야 버튼이 풀리는 확인 입력창 (기존 resetConfirmText와 같은 패턴,
    다만 상태 변수는 새로 만들 것 — 초기화 확인 입력과 섞이면 안 됨)
  - "먼저 지금 데이터 백업" 버튼도 옆에 둘 것 (handleExport 재사용)
  - 확인 버튼을 누르면:
    1. supabase.rpc("self_delete_account") 호출
    2. 에러가 나면(마지막 관리자 등) 그 메시지를 그대로 화면에 보여주고 끝
    3. 성공하면 resetLocalOnly()로 이 브라우저의 로컬 데이터도 같이 지우고
       (탈퇴했는데 로그아웃 후 예전 로컬 기록이 그대로 보이면 혼란스럽다),
       supabase.auth.signOut() 호출 후 window.location.href = "/login?deleted=1"

## 4. 로그인 화면 안내 — LoginView.tsx

쿼리스트링 ?deleted=1 이 있으면 "계정이 삭제되었습니다." 같은 안내 문구를 보여줄 것
(기존에 ?error=auth_callback_failed 를 읽어 에러 문구를 보여주는 부분이 이미 있으니
같은 패턴으로 추가).

## 스타일

- 다크모드 대응, 모바일 반응형
- any 타입 금지
- 작업 끝나면 npx tsc --noEmit 통과 확인
```

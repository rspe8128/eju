# 커서에 줄 프롬프트 — Google 로그인 두 번 해야 하는 문제

> 사용법: `---` 아래 코드블록만 그대로 복사해서 커서에 붙여넣을 것.

---

## 왜 이런 일이 생기나

`LoginView.tsx`가 `signInWithOAuth`의 `redirectTo`를 `/profile`로 바로 잡아 두고 있다.
Google 로그인이 끝나면 브라우저가 `/profile?code=...`로 돌아오는데, 이 요청은
**Next.js 미들웨어를 먼저 거친다.** 그 시점엔 아직 세션 쿠키가 없으므로(코드를
세션으로 바꾸는 절차가 아직 실행되지 않았으므로) 미들웨어가 로그인 안 된 사용자로
보고 `code`를 버린 채 `/login`으로 다시 리다이렉트해버린다. 그래서 첫 로그인 시도는
사실상 항상 실패하고, 다시 시도해야 붙는다.

Supabase의 공식 Next.js App Router 가이드가 `/auth/callback` 전용 라우트를 만들고
거기서 `exchangeCodeForSession(code)`를 서버에서 직접 호출하라고 하는 게 정확히 이
문제 때문이다. 지금 이 프로젝트엔 그 라우트가 없다.

---

```
Google 로그인 후 세션이 바로 안 잡히고 두 번 시도해야 붙는 문제를 고쳐줘.
원인은 OAuth 콜백을 서버에서 교환하는 라우트가 없어서, redirect가 미들웨어의
로그인 체크에 걸려 code가 버려지는 것이다.

## 1. 콜백 라우트 추가

src/app/auth/callback/route.ts 를 새로 만든다:

- GET 요청을 받아 쿼리스트링에서 code와 next(없으면 "/profile")를 읽는다
- code가 있으면 src/lib/supabase/server.ts의 createSupabaseServerClient()로
  서버 클라이언트를 만들어 supabase.auth.exchangeCodeForSession(code)를 호출한다
- 성공하면 origin + next 로 NextResponse.redirect
- code가 없거나 교환에 실패하면 /login?error=auth_callback_failed 로 리다이렉트하고,
  LoginView에서 이 쿼리를 읽어 에러 메시지를 보여준다("로그인 처리 중 문제가
  발생했습니다. 다시 시도해 주세요." 정도)

## 2. 미들웨어에서 이 라우트를 반드시 공개 경로로 둘 것

src/lib/supabase/middleware.ts의 PUBLIC_PATHS(또는 isPublicPath)에 "/auth/callback"을
추가한다. 여기가 막혀 있으면 exchangeCodeForSession이 실행되기도 전에 미들웨어가
또 튕겨버려서 아무 의미가 없어진다. 반드시 확인할 것.

## 3. LoginView에서 리다이렉트 목적지 변경

const redirectTo = `${window.location.origin}/auth/callback?next=/profile`;

signInWithOAuth의 options.redirectTo를 이걸로 바꾼다. 그 외 로직(체크박스, agreed
상태, markTermsPending 호출 시점)은 그대로 둔다 — 로그인 버튼 누르기 직전에
markTermsPending()이 호출되는 순서는 지금 그대로 유지.

## 4. 확인

- npx tsc --noEmit 통과
- 로컬에서 실제 로그인 플로우를 처음부터 끝까지 한 번 밟아서, 한 번의 클릭으로
  /profile까지 들어가지는지 확인할 것. (로컬 개발 환경은 Supabase 프로젝트의 Redirect
  URLs 설정에 http://localhost:3000/auth/callback 이 등록돼 있어야 동작한다 —
  등록 안 돼 있으면 나에게 알려줄 것. 이건 코드로 고칠 수 없고 Supabase 대시보드
  Authentication → URL Configuration에서 직접 추가해야 하는 항목이다)
```

---

## 별개로 확인해야 하는 것 (커서 시킬 필요 없음)

"동의해도 배너가 계속 뜨는" 문제는 코드 문제가 아니라 DB 마이그레이션을 실제
Supabase 프로젝트에 안 돌려서일 가능성이 크다. Supabase 대시보드 → Table Editor →
`profiles` 테이블에 `terms_agreed_at` 컬럼이 있는지 먼저 확인할 것. 없으면
`supabase/phase4_terms_consent.sql`을 SQL Editor에 붙여넣고 실행하면 된다.

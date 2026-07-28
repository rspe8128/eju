# 커서에 줄 프롬프트 — 로그인 · 프로필 · DB

가장 큰 변경이다. **한 번에 다 시키지 말고 Phase 1 → 2 → 3 순서로 따로 붙일 것.**
각 Phase가 끝날 때마다 `npm run dev`로 확인하고 커밋하는 편이 안전하다.

---

## 먼저 알아둘 것

### 지금 구조 (커서가 깨뜨리기 쉬운 것들)

- `StorageContext`가 **동기적으로** `data: AppData` 하나를 들고 있고, 화면 28곳이 그걸 쓴다.
  DB를 붙인다고 이걸 async로 바꾸면 28개 파일을 전부 손봐야 하고 거의 확실히 깨진다.
- `src/lib/storage/codec.ts`가 저장 직전에 카드를 압축한다(카드당 259자 → 105자).
- 서비스워커로 **오프라인 학습**이 된다. DB를 붙이면서 이걸 잃으면 안 된다.
- 백업·복원, 전체 초기화가 이미 있다.

### 그래서 권하는 방향

**localStorage를 그대로 두고, DB는 뒤에서 동기화하는 사본으로 쓴다.**

- 읽기·쓰기는 지금처럼 localStorage에서 즉시 (화면 코드 안 건드림, 오프라인 유지)
- 바뀔 때마다 디바운스해서 DB로 밀어 올림
- 앱을 켤 때 DB가 더 최신이면 내려받아 덮어씀

DB를 진짜 원본으로 삼는 구조가 "정석"이지만, 그러면 28개 화면을 전부 로딩·에러 처리로
다시 짜야 하고 오프라인도 잃는다. **이 앱에서는 그럴 이유가 없다.**

---

## 사전 준비 (내가 직접 해야 하는 것)

1. https://supabase.com 에서 프로젝트를 만든다 (무료 플랜으로 충분)
2. Project Settings → API 에서 아래 세 값을 복사해 `.env.local`에 넣는다

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> `SUPABASE_SERVICE_ROLE_KEY`는 **절대 NEXT_PUBLIC_ 붙이면 안 된다.** 브라우저로 새어 나가면
> 누구나 남의 데이터를 읽고 지울 수 있다. 서버 라우트에서만 쓴다.

3. Vercel 배포용으로 Project → Settings → Environment Variables 에도 같은 값을 등록

---

## Phase 1 — 로그인과 프로필

```
Supabase Auth로 로그인 기능을 붙여줘. 아직 학습 데이터는 건드리지 않는다 — 이번엔 인증과 프로필만.

## 설치·설정
- @supabase/supabase-js 와 @supabase/ssr 설치
- src/lib/supabase/client.ts (브라우저용), server.ts (서버 컴포넌트·라우트용) 두 개로 나눠 만들 것
- 미들웨어로 세션 쿠키를 갱신 (@supabase/ssr 의 표준 패턴)

## 로그인 방법
- 이메일 + 비밀번호
- Google OAuth
두 가지. 매직링크는 넣지 마 — 메일 확인하러 갔다 오는 흐름이 학습 앱에는 번거롭다.

## 화면
- /login — 로그인·회원가입 탭 하나로. 비밀번호 재설정 링크
- /profile — 프로필 편집
- AppShell 사이드바 맨 아래에 현재 로그인 상태 표시(아바타 + 이름), 누르면 /profile
- 로그아웃 버튼

## profiles 테이블

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  target_university text,      -- 목표 대학
  target_major text,           -- 목표 학과
  exam_target_date date,       -- 목표 EJU 회차
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

- RLS를 켜고, 본인 행만 select/insert/update 가능하게 정책을 만들 것
- auth.users 에 새 유저가 생기면 profiles 행이 자동으로 생기도록 트리거를 넣을 것
- 아바타는 Supabase Storage 버킷(avatars)에 올리고 public read 로

## 중요 — 로그인 없이도 앱이 그대로 돌아가야 한다
지금 쓰던 사람이 로그인하지 않아도 모든 기능이 지금처럼 동작해야 한다.
로그인은 "여러 기기에서 쓰려면 하는 것"이지 필수가 아니다.
로그인하지 않은 상태에서 /profile 에 들어가면 로그인 안내만 보여주고 앱은 계속 쓸 수 있게.

## 시험 프로필과의 관계
설정(/settings)에 이미 examProfile(트랙·수학 코스·이과 선택·목표 점수·시험일)이 있다.
이건 학습 데이터라 그대로 두고, profiles 테이블에는 사람에 대한 것(이름·아바타·목표 대학)만 넣어.
두 개를 합치려 하지 마.
```

---

## Phase 2 — 학습 데이터 동기화

Phase 1이 잘 돌아가는 걸 확인한 뒤에 붙일 것.

```
로그인한 사용자의 학습 데이터를 Supabase에 동기화해줘.
localStorage를 원본으로 유지하고 DB는 뒤에서 따라오는 사본으로 쓴다.

## 왜 이 구조인가 (지켜야 할 제약)
- StorageContext가 동기적으로 data를 들고 있고 화면 28곳이 그걸 쓴다.
  이걸 async로 바꾸면 전부 다시 짜야 하고 오프라인도 잃는다. 그러니 바꾸지 마.
- 서비스워커 오프라인 학습이 계속 동작해야 한다.
- src/lib/storage/codec.ts 의 압축을 그대로 재사용할 것 (DB에도 압축본을 넣는다)

## 테이블

create table study_data (
  user_id uuid primary key references auth.users on delete cascade,
  payload jsonb not null,        -- encodeData(AppData) 결과
  version bigint not null default 1,
  device_label text,             -- 마지막으로 올린 기기 (예: "Chrome · Windows")
  updated_at timestamptz default now()
);

RLS 켜고 본인 행만 접근 가능하게.

한 행에 통째로 넣는 이유: 지금 저장 포맷을 그대로 쓸 수 있어서 화면 코드를 안 건드려도 된다.
전부 담아도 압축 후 2.2MB라 jsonb 한 행으로 충분하다.
나중에 카드 단위 증분 동기화가 필요해지면 그때 쪼개면 된다.

## 동작

**올리기 (push)**
- data가 바뀌면 3초 디바운스 후 업로드. 타이핑 중에 매번 쏘지 않게
- 오프라인이면 큐에 넣어 두고 온라인이 되면 올림 (useOnline 훅이 이미 있다)
- 성공하면 version + 1, updated_at 갱신

**내려받기 (pull)**
- 로그인 직후, 그리고 앱을 다시 포커스했을 때
- 서버 version이 로컬이 마지막으로 받은 version보다 크면 → 다른 기기에서 바뀐 것

**충돌 처리 — 여기가 제일 중요하다**
서버가 더 최신인데 로컬에도 저장 안 된 변경이 있으면 **말없이 덮어쓰지 마.**
다이얼로그를 띄우고 양쪽을 숫자로 비교해서 사용자가 고르게 할 것:

  이 기기: 카드 1,240장 · 마지막 학습 2026-07-28 14:30
  서버   : 카드 1,180장 · 마지막 학습 2026-07-28 09:12 (iPhone · Safari)

  [이 기기 것으로 덮어쓰기] [서버 것 내려받기] [먼저 백업받기]

자동 병합은 하지 마. 잘못 합치면 복구가 안 된다.

## 첫 로그인 마이그레이션
로그인했는데 서버에 데이터가 없고 로컬에는 있으면, 로컬 것을 그대로 올린다.
반대로 서버에 있고 로컬이 비어 있으면 내려받는다.
둘 다 있으면 위의 충돌 다이얼로그를 띄운다.

## 화면 표시
- 사이드바나 설정에 동기화 상태를 작게: "동기화됨 · 방금 전" / "오프라인 — 대기 중 3건" / "동기화 실패"
- 실패해도 앱은 계속 쓸 수 있어야 한다. 학습을 막지 마

## 백업·복원·초기화와의 관계
- 백업 내보내기는 그대로 둔다 (DB가 있어도 파일 백업은 별개의 안전장치다)
- 백업 복원 후에는 그 데이터를 서버에도 올릴 것
- 전체 초기화는 "이 기기만 초기화" / "서버 데이터까지 삭제" 를 나눠서 물어볼 것.
  기기만 지웠는데 서버에서 다시 내려오면 사용자가 당황한다
```

---

## Phase 3 — 경고 문구 정리

```
DB 동기화가 되면 localStorage 경고 문구를 상황에 맞게 정리해줘.

## 지우지 말고 조건부로 바꿀 것
로그인하지 않은 사용자는 **여전히 이 브라우저에만 데이터가 있다.** 그 사람에게는 경고가 맞다.
그러니 문구를 삭제하지 말고 로그인 여부로 갈라라.

| 위치 | 로그인 O | 로그인 X |
|---|---|---|
| 설정 백업 섹션 | "여러 기기에 동기화됨. 파일 백업은 선택" | 지금 문구 그대로 |
| 대시보드 30일 백업 알림 | 안 띄움 | 지금처럼 띄움 |
| 보관함 저장 공간 미터 | 그대로 두되 "한도를 넘겨도 서버에는 남는다" 한 줄 추가 | 지금 그대로 |

## 그래도 남겨야 하는 것
- 저장 공간 미터 자체는 지우지 마. localStorage 한도는 로그인해도 여전히 존재하고,
  한도를 넘기면 그 기기에서 저장이 실패한다
- 전체 초기화의 "되돌릴 수 없다" 경고는 그대로. 오히려 서버까지 지우면 더 위험하다

## 파일 위치
- src/components/settings/SettingsView.tsx (백업 섹션 · 전체 초기화)
- src/components/dashboard/DashboardView.tsx (30일 백업 알림)
- src/components/library/StorageMeter.tsx
```

---

## 커서에게 반드시 같이 말할 것

```
## 하지 말아야 할 것
- SUPABASE_SERVICE_ROLE_KEY 를 클라이언트 코드에서 쓰거나 NEXT_PUBLIC_ 접두사를 붙이는 것
- RLS를 끄고 개발하는 것 (켠 채로 정책을 제대로 쓸 것)
- StorageContext 를 async로 바꾸는 것
- 서비스워커를 걷어내는 것
- 동기화 실패 시 학습을 막는 것
- 충돌을 자동으로 병합하는 것

## 다 하고 나면
npm run typecheck
npm run check:vocab
npm run check:mock
npm run check:modules
전부 통과시킬 것. 그리고 아래를 직접 확인해줘.

1. 로그인하지 않은 상태로 앱 전체가 지금처럼 동작하는가
2. 로그인 → 로컬 데이터가 서버에 올라가는가
3. 다른 브라우저(시크릿 창)로 같은 계정 로그인 → 데이터가 내려오는가
4. 비행기 모드에서 학습 → 온라인 복귀 시 올라가는가
5. 두 기기에서 각각 다르게 바꾼 뒤 열면 충돌 다이얼로그가 뜨는가
```

---

## 내가 조심스러운 부분

**충돌 처리가 이 작업의 전부라고 봐도 된다.** 나머지는 표준적인 코드지만,
두 기기에서 같은 계정을 쓰다가 한쪽 기록이 조용히 사라지면 그게 제일 뼈아프다.
Phase 2를 붙인 직후에는 **반드시 백업 파일을 하나 내려받아 두고** 며칠 써 보길 권한다.

**Phase 1만 하고 멈춰도 된다.** 로그인·프로필만 있어도 "내 계정"이라는 감각은 생기고,
동기화는 나중에 붙여도 늦지 않다. 오히려 Phase 2가 급하지 않다면 미루는 편이 안전하다.

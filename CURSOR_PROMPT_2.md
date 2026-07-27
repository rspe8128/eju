# EJU Study — 2차 기능 구현 프롬프트 (커서용)

> 사용법: 아래 "0. 컨텍스트"를 먼저 붙여넣고, 그 다음 Phase를 **하나씩** 순서대로 붙여넣어 작업시킬 것.
> 한 번에 전부 시키면 품질이 떨어진다. 각 Phase 끝날 때마다 `npm run dev`로 확인 후 다음으로.

---

## 0. 컨텍스트 (매 Phase 앞에 붙여넣기)

```
이 프로젝트는 EJU(일본유학시험) 준비용 개인 학습 웹앱이다.
스택: Next.js 16 App Router + TypeScript + Tailwind v4 + lucide-react + recharts, 데이터는 localStorage.
Vercel 배포 기준이고 로그인/서버 DB는 없다.

기존 구조:
- src/lib/types.ts        : Deck, Card, Subject, Unit, Item, MistakeEntry, Goal, Deadline, StudyLog, AppData
- src/lib/srs.ts          : SM-2 기반 간격반복 (updateSRS, isDueForReview, getDueCards)
- src/lib/seed.ts         : 초기 시드 데이터
- src/lib/data/*.ts       : 단어 데이터 (japaneseWords.ts, toeflWords.ts, 각 100개)
- src/lib/storage/        : localStorage 저장 레이어 (load/save/reset/export/import)
- src/context/StorageContext.tsx : 모든 상태 변경 액션이 여기 모여있음. 새 기능도 여기에 액션 추가
- src/components/…        : layout/AppShell, dashboard, study(Flashcard/Quiz/DeckStudy), subjects, review, schedule, settings

작업 규칙:
1. 기존 타입/컨텍스트 구조를 유지하고 확장할 것. 새 상태관리 라이브러리 도입 금지.
2. AppData에 필드를 추가할 때는 반드시 기존 저장 데이터와의 호환을 위해 optional 처리 + 마이그레이션 함수를 거칠 것.
3. 모든 UI는 한국어, 다크모드 대응, 모바일 반응형 필수.
4. 새 페이지는 src/app/…/page.tsx 에서 클라이언트 컴포넌트를 감싸는 형태로 (기존 패턴 따를 것).
5. any 타입 금지. 작업 끝나면 npx tsc --noEmit 통과시킬 것.
```

---

## Phase 1 — 데이터 스키마 버전 관리 + 마이그레이션

**목적**: 앞으로 기능을 추가할 때마다 기존 localStorage 데이터가 깨지지 않게 기반을 먼저 깐다.

요구사항:

1. `AppData`에 `schemaVersion: number` 추가 (현재 버전 = 1).
2. `src/lib/storage/migrate.ts` 생성. `migrate(raw: unknown): AppData` 함수를 만들어서:
   - `schemaVersion`이 없으면 0으로 간주하고 순차적으로 마이그레이션 함수를 적용
   - 각 버전 업 함수는 `migrations: Record<number, (d: any) => any>` 형태로 등록
   - 누락된 배열 필드는 빈 배열로 채움 (앱이 절대 크래시하지 않게)
3. `loadData()`가 파싱 직후 항상 `migrate()`를 통과하도록 수정.
4. `importData()`도 동일하게 마이그레이션 적용.
5. 설정 화면에 "현재 데이터 버전 / 카드 수 / 오답 수" 요약을 표시.

---

## Phase 2 — EJU 과목 체계로 재편 + 시험 점수 트래킹

**목적**: 지금은 "일본어 / 토플 / 교과목"인데, EJU 실제 과목 체계를 1급 시민으로 만든다.

요구사항:

1. `src/lib/eju.ts` 생성. EJU 시험 상수를 정의:
   ```ts
   export const EJU_SUBJECTS = {
     japanese:  { label: "일본어", maxScore: 400, writingMax: 50, minutes: 125 },
     math1:     { label: "수학 코스1", maxScore: 200, minutes: 80 },
     math2:     { label: "수학 코스2", maxScore: 200, minutes: 80 },
     sogo:      { label: "종합과목", maxScore: 200, minutes: 80 },
     physics:   { label: "물리", maxScore: 100, minutes: 80 },
     chemistry: { label: "화학", maxScore: 100, minutes: 80 },
     biology:   { label: "생물", maxScore: 100, minutes: 80 },
   } as const;
   ```
   - 이과(물리·화학·생물 중 2과목)와 종합과목은 동시 선택 불가라는 제약도 상수/헬퍼로 표현.
2. `ExamProfile` 타입 추가 — 사용자가 "내가 볼 과목"과 "목표 점수"를 설정:
   ```ts
   type ExamProfile = {
     track: "humanities" | "science";       // 문과=종합과목 / 이과=이과 2과목
     mathCourse: "course1" | "course2";
     scienceChoices: ("physics"|"chemistry"|"biology")[]; // 이과일 때 2개
     targetScores: Record<string, number>;  // 과목 코드 → 목표 점수
     examDate: string;                      // 목표 시험일 (YYYY-MM-DD)
   };
   ```
3. `/settings`에 "시험 프로필" 섹션 신설 — 위 항목들을 UI로 설정. 이과 선택 시 이과 2과목 체크박스, 문과 선택 시 종합과목 자동.
4. `ExamRecord` 타입 추가 — 실제/모의 시험 점수 기록:
   ```ts
   type ExamRecord = { id: string; date: string; kind: "mock" | "real"; scores: Record<string, number>; memo?: string };
   ```
5. 새 페이지 `/scores` 신설:
   - 시험 기록 추가 폼 (날짜, 모의/실전, 과목별 점수 입력)
   - 목표 점수 대비 현재 점수를 과목별 게이지 바로 표시
   - recharts LineChart로 회차별 점수 추이 (과목별 라인)
   - 총점(선택 과목 합계) 추이도 별도 표시
6. AppShell 네비게이션에 "성적" 메뉴 추가 (아이콘: TrendingUp).

---

## Phase 3 — 학습 플랜 엔진 (자동 진도 계획)

**목적**: "시험일까지 남은 날 × 남은 학습량"을 계산해서 오늘 뭘 얼마나 해야 하는지 자동으로 뽑아준다. 이게 이 앱의 핵심 기능이다.

요구사항:

1. `src/lib/plan.ts` 생성:
   ```ts
   type PlanTarget = {
     id: string;
     kind: "deck" | "subject";     // 단어 덱 또는 교과목
     refId: string;                // deckId 또는 subjectId
     totalUnits: number;           // 총 카드 수 또는 총 아이템 수 (자동 계산)
     completedUnits: number;       // 최소 1회 이상 학습(SRS repetitions>0 / solved) 한 수
     dueDate: string;              // 이 목표를 끝내야 하는 날짜
     dailyQuota: number;           // 자동 계산 결과
   };
   ```
   - `computePlan(data, examDate)`: 각 덱/과목에 대해 남은 학습량 ÷ 남은 일수 = 하루 할당량을 계산
   - 주말 제외 옵션, 여유 버퍼(시험 N일 전 완료) 옵션 지원
   - 오늘 복습 예정 카드(SRS due)는 할당량과 **별도로** 집계
2. 새 페이지 `/plan`:
   - 상단: 목표 시험일까지 D-day, 전체 진행률 도넛
   - 목표별 카드 리스트: 진행률 바, 하루 할당량, "이 속도면 X월 X일 완료 / 목표보다 N일 지연" 예측 표시
   - 지연된 목표는 빨간색 강조 + "따라잡으려면 하루 N개" 재계산값 표시
   - 목표(PlanTarget) 추가/삭제/기한 수정 UI
3. 대시보드(`/`) 상단에 **"오늘의 할 일"** 카드 추가:
   - 오늘 복습 카드 N개 → 바로 학습 시작 버튼
   - 플랜 할당량 기준 신규 카드 N개 → 바로 학습 시작 버튼
   - 오답 재도전 N개
   - 각 항목은 완료 시 체크 표시되고 진행률 바가 채워짐
4. `StorageContext`에 `planTargets` 상태와 `addPlanTarget / updatePlanTarget / removePlanTarget` 액션 추가.

---

## Phase 4 — 진도·숙련도 시각화 강화

요구사항:

1. `src/lib/progress.ts`: 카드 숙련도를 4단계로 분류하는 헬퍼
   - `new` (repetitions 0) / `learning` (1~2) / `review` (3~5) / `mastered` (repetitions ≥ 6 && easeFactor ≥ 2.5)
2. 덱 상세 화면(`DeckStudyView`)에 숙련도 분포 스택 바 추가 (4단계 색상 구분 + 개수).
3. 새 컴포넌트 `StudyHeatmap` — 최근 12주 학습 잔디(깃허브 스타일 히트맵). `studyLogs` 기반, 날짜별 총 학습 수에 따라 색 농도 5단계. 셀 hover 시 툴팁.
4. `/plan` 또는 대시보드에 recharts BarChart로 최근 14일 일별 학습량 표시 (과목별 스택).
5. 과목별 정답률 통계: 학습 이력에 정오답을 기록해야 하므로 `StudyLog`를 확장:
   ```ts
   type StudyLog = { date: string; subjectId: string; count: number; correct: number; wrong: number };
   ```
   (마이그레이션에서 기존 로그에 correct/wrong = 0 채우기)

---

## Phase 5 — 학습 세션 강화 (타이머 · 세션 요약 · 오답 재도전)

요구사항:

1. **뽀모도로 타이머**: AppShell 우상단에 고정 타이머 위젯. 25분/5분 기본, 설정에서 시간 변경 가능. 완료 시 브라우저 알림(Notification API, 권한 요청 후) + 세션 기록 저장.
   ```ts
   type FocusSession = { id: string; startedAt: string; minutes: number; subjectId?: string };
   ```
2. **세션 요약 화면**: 플래시카드/퀴즈 세션 끝나면 결과 요약 표시 — 총 N개, 기억함/헷갈림/모름 개수, 정답률, 소요 시간, "틀린 것만 다시 풀기" 버튼.
3. **오답 재도전 모드**: `/review`에서 미해결 오답만 모아 퀴즈 세션 실행. 오답 소스가 카드/문제 혼합이어도 동작하게.
4. **퀴즈 개선**:
   - 현재 오답 보기가 같은 세션 10장 안에서만 뽑히는데, **덱 전체에서** 뽑도록 수정 (보기 다양성 확보)
   - 문제 수를 10 고정이 아니라 10/20/전체 중 선택 가능하게
   - 주관식 입력 모드 추가 (정답 문자열 비교, 공백·대소문자 무시)
   - 방향 전환 토글 UI (뜻→단어 / 단어→뜻) 실제로 노출
5. 플래시카드에 오디오 없이도 되는 **일본어 읽기(후리가나) 토글** — `card.reading`을 앞면에 보일지 말지 설정에서 제어.

---

## Phase 6 — 콘텐츠 입력 편의 기능

요구사항:

1. **CSV/TSV 대량 입력**: `/settings`에 텍스트에어리어 붙여넣기 → 미리보기 테이블 → 덱 선택/신규 생성 → 일괄 등록.
   - 형식: `단어[탭]읽기[탭]뜻[탭]예문` (탭 또는 쉼표 구분 자동 감지)
   - 중복(front 기준) 감지해서 "건너뛰기 / 덮어쓰기" 선택
2. **카드 편집/삭제**: 덱 상세에서 카드 목록 보기 + 인라인 수정 + 삭제. 검색 필터 포함.
3. **태그 시스템 활성화**: 카드에 태그 부여/필터. 태그별 학습 세션 실행.
4. **교과목 아이템 편집**: 개념(markdown) 작성 시 미리보기 있는 에디터. 문제는 정답/해설 필드 분리 (`explanation` 필드 추가).
5. **JSON 백업 개선**: 파일 다운로드/업로드 버튼 (현재는 텍스트 기반이면 파일 방식 추가), 파일명에 날짜 포함.

---

## Phase 7 — EJU 일본어 특화 기능

요구사항:

1. **記述(작문) 연습 모드** — 새 페이지 `/writing`:
   - EJU 기술 문제 형식(2개 주제 중 택1, 400~500자, 30분)에 맞춘 연습 화면
   - 타이머(설정 가능, 기본 30분) + 실시간 글자수 카운터(400~500 구간에서 초록색)
   - 작성 내용 저장 (`WritingEntry { id, date, prompt, body, charCount, minutes, selfScore?, memo? }`)
   - 연습 주제 프리셋 20개를 `src/lib/data/writingPrompts.ts`에 시드로 넣기 (찬반형/설명형 등 EJU 빈출 유형)
   - 과거 작성물 목록 + 다시 보기
2. **문법 카드 타입**: 문법 덱의 카드는 빈칸 채우기 형식으로 출제 (`front`에 `___` 포함 문장, 보기 4개). Card에 `options?: string[]` optional 필드 추가.
3. **한자 카드**: 한자 덱은 음독/훈독을 각각 필드로 (`onyomi?`, `kunyomi?`). 카드 뒷면에 음독/훈독/예시 단어 표시.
4. **청해 딕테이션 노트**: 들은 문장을 받아쓰고 정답과 비교하는 간단한 페이지. 오디오는 없으므로 사용자가 직접 정답 텍스트를 입력해 두고 나중에 받아쓰기 연습하는 방식.

---

## Phase 8 — 마무리 다듬기

1. 전역 검색(⌘K / Ctrl+K): 카드·개념·문제·설정을 통합 검색하는 커맨드 팔레트.
2. 빈 상태(Empty state) 전부 점검 — 데이터 없을 때 안내 문구 + 액션 버튼.
3. 접근성: 키보드 포커스 링, aria-label, 색상 대비 확인.
4. PWA 설정 (manifest.json + 아이콘) — 휴대폰 홈 화면에 추가해서 앱처럼 쓰게.
5. `npx tsc --noEmit`, `npm run lint`, `npm run build` 모두 통과 확인.
6. README.md 작성 — 기능 목록, 데이터 백업 방법, 배포 방법.

---

## 우선순위 (시간 없으면 이것만)

**Phase 3(학습 플랜) → Phase 2(점수 트래킹) → Phase 5(세션 강화) → Phase 6(대량 입력)** 순서가 실제 공부에 가장 도움이 큰 순서다. Phase 1은 그 앞에 반드시 먼저 해야 데이터가 안 깨진다.

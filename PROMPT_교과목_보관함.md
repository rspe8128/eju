# 커서에 붙여넣을 프롬프트 — 교과목 학습 모듈 보관함

콘텐츠(모듈 16개)와 카탈로그 코드는 **이미 만들어져 있다.** 커서가 할 일은 UI와
저장 연결이다. 아래 블록을 그대로 복사해서 붙여넣으면 된다.

---

```
단어장 보관함(/study/library)과 똑같은 방식으로, 교과목 학습도 "모듈을 담아서 쓰는" 구조로 바꿔줘.

## 이미 준비된 것 (새로 만들지 말고 그대로 쓸 것)

- src/lib/data/subjects/modules.json — 모듈 16개 (개념 32개 + 문제 48개)
- src/lib/data/subjects/modules.ts — 카탈로그. 아래를 export 한다
  - STUDY_MODULES: StudyModule[]
  - StudyModule = { id, subjectId, title, goal, order, conceptCount, problemCount, build() }
  - build() 는 { unit: Unit, items: Item[] } 를 돌려준다. id는 결정적이라
    같은 모듈을 두 번 담아도 같은 id가 나온다
  - modulesBySubject() — 과목별로 묶은 목록 (수학 → 종합 → 물리 → 화학 → 생물 순)
  - getStudyModule(id), unitIdOf(moduleId), MODULE_TOTALS

## 할 일

### 1. StorageContext에 두 개 추가

- addStudyModule(moduleId: string): 
  getStudyModule(id).build() 로 unit·items를 만들어 data.units / data.items 에 넣는다.
  이미 같은 unit.id 가 있으면 아무것도 하지 않는다 (버튼 연타·새로고침 대비).
- removeStudyModule(moduleId: string):
  해당 unit과 그 unit에 속한 items를 지운다. 
  items를 참조하는 mistakes(sourceType === "problem")도 같이 정리할 것.

addLibraryDeck / removeDeck 이 이미 같은 패턴으로 구현돼 있으니 그대로 따라가면 된다.

### 2. 시드에서 교과목 콘텐츠를 뺀다

src/lib/seed.ts 의 getSeedData() 에서 units: UNITS, items: ITEMS 를 빈 배열로 바꾼다.
subjects: SUBJECTS 는 그대로 둔다 (과목 목록 자체는 있어야 화면이 그려진다).

단어장 때와 같은 이유다 — 담은 것만 학습 목록에 들어가게 한다.
기존 사용자의 데이터는 건드리지 말 것. unit id가 같으므로 보관함에서 "추가됨"으로 뜬다.

### 3. 보관함 화면 (/study/modules)

- 과목별로 묶어서 모듈 카드 목록. 각 카드에 제목, goal(한 줄 설명), "개념 2 · 문제 3", 추가/빼기 버튼
- 이미 담은 모듈은 "추가됨" 배지 + 휴지통 버튼
- 빼기는 확인을 받을 것. 문제 풀이 기록(solved)이 사라진다는 걸 숫자로 보여주기
- 과목별 "전체 추가" 버튼
- 저장 공간 미터는 VocabLibraryView 의 StorageMeter 를 재사용

VocabLibraryView.tsx 를 참고하되, 복붙하지 말고 공통 부분(StorageMeter, 카드 행, 확인 모달)은
공용 컴포넌트로 빼서 양쪽이 같이 쓰게 해줘.

### 4. 빈 상태 안내

교과목 화면(/study/subjects, SubjectListView·SubjectDetailView)에서 담은 모듈이 하나도 없으면
"보관함에서 학습 모듈을 담으세요" + /study/modules 로 가는 버튼을 띄운다.
DeckStudyView 에 이미 같은 형태의 빈 상태가 있으니 톤을 맞출 것.

### 5. 사이드바

AppShell 의 "학습" 그룹에 "학습 모듈 보관함"(/study/modules)을 넣고,
CommandPalette 의 staticLinks 에도 추가한다.
"단어장 보관함" 바로 아래에 두면 자연스럽다.

### 6. 검증 스크립트

scripts/check-modules.mjs 를 만들고 package.json 에 "check:modules" 로 등록해줘.
scripts/check-vocab.mjs 와 같은 방식(tsc → CommonJS 컴파일 후 require)으로 확인할 것:
- 모듈 id / unit id / item id 중복 없음
- conceptCount·problemCount 가 실제 개수와 일치
- 개념 markdown 이 비어 있지 않음, 문제의 question·answer·explanation 이 모두 있음
- 전부 담았을 때 localStorage 사용량 (storage/codec.ts 의 encodeData 로 잰다)
- 시드의 units·items 가 비어 있는지

## 주의

- 항목 내용을 mistakes 같은 곳에 복사하지 말 것. id만 저장한다
- unit.order 로 정렬해서 보여줄 것. 1단원부터 순서대로 공부하는 흐름이다
- 다 하고 나면 npm run check:modules, npm run check:vocab, npm run check:mock,
  npm run typecheck 를 전부 통과시킬 것
```

---

## 내가 만들어 둔 모듈 목록

| 과목 | 모듈 |
|---|---|
| 수학 코스1 (5) | 수와 식·인수분해 / 이차방정식 / 이차함수 / 도형과 계량(삼각비) / 경우의 수와 확률 |
| 종합과목 (5) | 민주주의와 삼권분립 / 시장과 가격 / 재정과 금융 / 국제기구와 무역 / 인구와 노동 |
| 물리 (2) | 운동과 힘 / 파동과 소리 |
| 화학 (2) | 물질량과 화학반응식 / 산과 염기·중화 |
| 생물 (2) | 세포와 대사 / 유전과 유전자 |

합계 **16모듈 · 개념 32 · 문제 48**.

문과 트랙(수학 코스1 + 종합과목) 설정에 맞춰 그 두 과목에 무게를 뒀다.
개념 노트마다 **일본어 용어표**를 붙였다 — EJU는 일본어로 보는 시험이라
내용을 알아도 용어에서 막히는 일이 가장 많기 때문이다.

문제는 EJU가 실제로 노리는 함정을 겨냥했다. 예를 들어
- 「重解をもつ」는 D = 0 이지 D ≥ 0 이 아니다
- 황산은 2가라 중화 계산에서 가수를 빠뜨리면 답이 절반이 된다
- 책에 작용하는 중력과 수직항력은 작용반작용이 아니라 힘의 균형이다
- 원자재 가격은 수요가 아니라 공급 곡선을 움직인다

## 모듈을 더 넣고 싶으면

`src/lib/data/subjects/modules.json` 에 같은 모양으로 항목을 추가하면 된다.
코드는 손댈 필요가 없다.

```json
{
  "id": "mod-math-06",
  "subjectId": "subject-math",
  "order": 6,
  "title": "정수의 성질",
  "goal": "약수·배수와 유클리드 호제법을 다룬다.",
  "concepts": [{ "title": "...", "markdown": "## ..." }],
  "problems": [{ "title": "...", "question": "...", "answer": "...", "explanation": "..." }]
}
```

subjectId 는 `subject-math` / `subject-sogo` / `subject-physics` /
`subject-chemistry` / `subject-biology` 중 하나여야 한다.

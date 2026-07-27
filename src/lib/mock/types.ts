/**
 * 모의고사 문항 스키마.
 *
 * ── 왜 자체 문항인가 ────────────────────────────────────────────────
 * JASSO 공개 기출 PDF에서는 문제를 추출할 수 없다. 두 가지 이유가 겹친다.
 *
 *  1) 일본어(日本語) 과목 공개본은 독해 지문이 통째로 삭제돼 있다.
 *     PDF 텍스트 레이어에 남아 있는 문구가 이것뿐이다 →
 *     「試験問題としては成立していますが、著作権上の都合により本問題の
 *       ウェブ掲載はいたしません。」
 *  2) 수학·종합과목·이과 PDF는 텍스트 레이어가 없는 스캔 이미지라
 *     기계 추출 자체가 불가능하다.
 *
 * 게다가 JASSO 고지상 기출의 번안(=번역)·공중송신은 금지돼 있어서,
 * 설령 추출이 되더라도 "한국어 번역을 붙여 웹에 올리는" 형태는 만들 수 없다.
 *
 * 그래서 이 파일이 정의하는 것은 **EJU 출제 형식을 그대로 따른 자체 제작 문항**이다.
 * 저작권 문제가 없으므로 지문을 화면에 띄우고 DeepL로 번역해 보여줄 수 있다.
 * (기존의 JASSO PDF 기반 기출 풀이 화면은 위 이유로 걷어냈다.)
 *
 * ── 확장 ────────────────────────────────────────────────────────────
 * 과목 중립적으로 설계했다. 수학·종합과목·이과를 추가할 때는
 * `src/lib/mock/papers/` 아래에 MockPaper 객체 하나를 더 만들고
 * `registry.ts`의 배열에 넣기만 하면 된다. UI는 손대지 않아도 된다.
 */

/** 선택지 하나. key는 마크시트에 찍는 값("1"~"6"). */
export type MockChoice = {
  key: string;
  ja: string;
};

export type MockPassageKind =
  /** 설명문·논설문 등 일반 산문 */
  | "prose"
  /** 안내문·공지·모집요강 같은 실용문 */
  | "notice"
  /** 도표·그래프 해석 */
  | "chart"
  /** 청독해·청해 음성 스크립트 (풀 때는 가려져 있다) */
  | "script";

/** 도표형 지문에 붙는 표 데이터. */
export type MockTable = {
  caption?: string;
  headers: string[];
  rows: string[][];
  /** 표 아래 주석 (출처 표기 등) */
  footnote?: string;
};

export type MockPassage = {
  id: string;
  kind: MockPassageKind;
  /** 화면에 표시할 제목. 없으면 "지문"으로 표시된다. */
  title?: string;
  /** 일본어 본문. 배열 한 칸 = 한 문단. */
  ja: string[];
  table?: MockTable;
  /** 지문 앞에 붙는 상황 설명(청해의 「〜について話しています」 같은 것) */
  leadJa?: string;
  /** 어려운 어휘 힌트. 실전에는 없지만 복습용으로 유용하다. */
  glossary?: { ja: string; reading?: string; ko: string }[];
};

export type MockQuestion = {
  id: string;
  /** 시험지 상의 통짜 문항 번호 */
  number: number;
  /** 참조하는 지문 id. 지문 없는 단독 문항이면 생략. */
  passageId?: string;
  /** 발문 */
  stemJa: string;
  choices: MockChoice[];
  /** 정답 key */
  answer: string;
  /** 한국어 해설. 오답 이유까지 적어둘 것. */
  explanationKo: string;
  /** examTopics.ts의 topic id — 약점 분석 집계에 쓰인다. */
  topicId: string;
};

/** 기술(記述) 문항. 채점이 불가능하므로 별도 타입. */
export type MockWritingPrompt = {
  id: string;
  /** 주제 번호 (1 또는 2) */
  number: number;
  ja: string;
  /** 한국어 요약 — 번역 버튼 없이도 뭘 쓰라는 건지 알 수 있게 */
  hintKo: string;
  checklistKo: string[];
};

export type MockSectionKind =
  | "writing"
  | "reading"
  /** 청독해 — 도표를 보면서 음성을 듣는 형식 */
  | "listening-chart"
  /** 청해 — 음성만 */
  | "listening"
  /** 수학·이과처럼 지문 없이 문항만 이어지는 형식 */
  | "problems";

export type MockSection = {
  id: string;
  label: string;
  kind: MockSectionKind;
  minutes: number;
  /** 실제 시험지에 인쇄되는 지시문 */
  instructionsJa: string;
  /** 한국어 공략 팁 */
  hintKo: string;
  passages: MockPassage[];
  questions: MockQuestion[];
  writingPrompts?: MockWritingPrompt[];
};

export type MockPaper = {
  id: string;
  /** types.ts의 과목 코드 ("japanese" | "math1" | "sogo" ...) */
  subjectCode: string;
  subjectLabel: string;
  title: string;
  level: "입문" | "표준" | "실전";
  description: string;
  sections: MockSection[];
};

/** 한 세션(=섹션) 응시 결과. localStorage에 저장된다. */
export type MockAnswerMap = Record<string, string>;

export type MockProgress = {
  paperId: string;
  sectionId: string;
  answers: MockAnswerMap;
  /** 남은 시간(초). 타이머를 쓰지 않았으면 null */
  secondsLeft: number | null;
  /** 마지막으로 보고 있던 문항 index */
  cursor: number;
  updatedAt: string;
  submitted: boolean;
};

// ── 파생 계산 ────────────────────────────────────────────────────────

export function paperTotalMinutes(paper: MockPaper): number {
  return paper.sections.reduce((sum, s) => sum + s.minutes, 0);
}

export function paperQuestionCount(paper: MockPaper): number {
  return paper.sections.reduce((sum, s) => sum + s.questions.length, 0);
}

export function findPassage(
  section: MockSection,
  passageId: string | undefined
): MockPassage | undefined {
  if (!passageId) return undefined;
  return section.passages.find((p) => p.id === passageId);
}

/**
 * 한 지문에 여러 문항이 붙는 경우가 많다.
 * "이 문항이 속한 지문의 몇 번째 문항인지"를 표시하려고 그룹을 만든다.
 */
export function groupByPassage(
  section: MockSection
): { passage: MockPassage | null; questions: MockQuestion[] }[] {
  const groups: { passage: MockPassage | null; questions: MockQuestion[] }[] = [];
  for (const q of section.questions) {
    const last = groups[groups.length - 1];
    const pid = q.passageId ?? null;
    const lastPid = last?.passage?.id ?? null;
    if (last && lastPid === pid) {
      last.questions.push(q);
    } else {
      groups.push({
        passage: findPassage(section, q.passageId) ?? null,
        questions: [q],
      });
    }
  }
  return groups;
}

/** 지문 전체를 번역용 문자열 배열로 편다. */
export function passageTexts(passage: MockPassage): string[] {
  const out: string[] = [];
  if (passage.leadJa) out.push(passage.leadJa);
  if (passage.title) out.push(passage.title);
  out.push(...passage.ja);
  if (passage.table) {
    if (passage.table.caption) out.push(passage.table.caption);
    out.push(...passage.table.headers);
    for (const row of passage.table.rows) out.push(...row);
    if (passage.table.footnote) out.push(passage.table.footnote);
  }
  return out.filter((t) => t.trim().length > 0);
}

export function questionTexts(q: MockQuestion): string[] {
  return [q.stemJa, ...q.choices.map((c) => c.ja)];
}

/**
 * passageTexts()가 만든 순서대로 돌아온 번역 결과를, 원래 지문 구조에 맞춰 되돌린다.
 * 번역 패널을 원문과 같은 모양(문단·표)으로 보여주기 위한 것이다.
 * 순서를 바꾸려면 passageTexts()와 여기를 **반드시 같이** 고쳐야 한다.
 */
export function splitPassageTranslation(
  passage: MockPassage,
  lines: string[]
): {
  lead?: string;
  title?: string;
  paragraphs: string[];
  table?: MockTable;
} {
  // 빈 문자열은 passageTexts()에서 걸러졌으므로 여기서도 같은 규칙으로 센다.
  const queue = [...lines];
  const take = (src: string | undefined): string | undefined => {
    if (!src || !src.trim()) return undefined;
    return queue.shift() ?? "";
  };

  const lead = take(passage.leadJa);
  const title = take(passage.title);
  const paragraphs = passage.ja
    .filter((p) => p.trim().length > 0)
    .map(() => queue.shift() ?? "");

  let table: MockTable | undefined;
  if (passage.table) {
    const caption = take(passage.table.caption);
    const headers = passage.table.headers.map((h) =>
      h.trim() ? (queue.shift() ?? "") : ""
    );
    const rows = passage.table.rows.map((row) =>
      row.map((cell) => (cell.trim() ? (queue.shift() ?? "") : ""))
    );
    const footnote = take(passage.table.footnote);
    table = { caption, headers, rows, footnote };
  }

  return { lead, title, paragraphs, table };
}

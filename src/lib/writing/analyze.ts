import { MIN_CHARS, MAX_CHARS } from "./rubric";

/**
 * 규칙 기반 작문 자동 점검.
 *
 * AI 채점과 별개로, **AI 없이 코드로 확실히 잡히는 것**만 여기서 본다.
 * EJU 記述 감점 요인 중 상당수가 사실 기계적으로 판정 가능하다 —
 * 문체 혼용, 분량 미달, 회화체 사용, 접속 표현 부재 같은 것들이다.
 *
 * AI는 돈과 시간이 들고 가끔 틀리지만, 이 검사는 즉시·무료·항상 같은 결과다.
 * 그래서 AI 채점을 부르기 **전에** 여기서 먼저 걸러내게 한다.
 */

export type CheckLevel = "ok" | "warn" | "fail";

export type WritingCheck = {
  id: string;
  label: string;
  level: CheckLevel;
  detail: string;
  /** 본문에서 문제가 된 부분 (있으면 화면에 인용해 준다) */
  samples?: string[];
};

export type WritingStats = {
  /** 원고지 기준 글자 수 — 공백·줄바꿈 제외 */
  chars: number;
  /** 공백까지 포함한 길이 (참고용) */
  rawChars: number;
  sentences: number;
  paragraphs: number;
  avgSentenceLength: number;
  longestSentence: number;
};

/**
 * 원고지 기준 글자 수.
 * 예전에는 body.length를 그대로 썼는데, 그러면 공백·줄바꿈까지 세어
 * 400자를 넘겼다고 표시되지만 실제로는 미달인 일이 생겼다.
 */
export function countChars(text: string): number {
  return text.replace(/\s/g, "").length;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, "")
    .split(/(?<=[。！？])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function analyzeStats(text: string): WritingStats {
  const sentences = splitSentences(text);
  const lengths = sentences.map((s) => s.length);
  return {
    chars: countChars(text),
    rawChars: text.length,
    sentences: sentences.length,
    paragraphs: splitParagraphs(text).length,
    avgSentenceLength: sentences.length
      ? Math.round(lengths.reduce((a, b) => a + b, 0) / sentences.length)
      : 0,
    longestSentence: lengths.length ? Math.max(...lengths) : 0,
  };
}

/** です・ます체 문말 — 하나라도 있으면 である체 통일이 깨진 것이다. */
const POLITE_ENDINGS =
  /(です|ます|ました|ません|でした|でしょう|ましょう|ください)(?=[。、！？」）]|$)/g;

/** 회화체·구어 표현. 記述에서는 감점 대상이다. */
const CASUAL_WORDS: { word: RegExp; better: string }[] = [
  { word: /でも(?=[、。])|^でも/gm, better: "しかし" },
  { word: /だから/g, better: "したがって・そのため" },
  { word: /すごく|すごい/g, better: "非常に・きわめて" },
  { word: /ちょっと/g, better: "やや・少し" },
  { word: /けど|けれども(?=[、。])/g, better: "が・しかし" },
  { word: /みたいな|みたいに/g, better: "ような・ように" },
  { word: /やっぱり|やっぱ/g, better: "やはり" },
  { word: /たくさん(?=の)/g, better: "多くの" },
  { word: /いろんな/g, better: "さまざまな" },
  { word: /どんどん/g, better: "急速に" },
];

/** 문단을 잇는 접속 표현. 하나도 없으면 논지가 나열로만 보인다. */
const CONNECTIVES = [
  "まず",
  "第一に",
  "次に",
  "第二に",
  "一方",
  "他方",
  "しかし",
  "だが",
  "ところが",
  "したがって",
  "そのため",
  "ゆえに",
  "つまり",
  "すなわち",
  "たとえば",
  "例えば",
  "確かに",
  "もちろん",
  "このように",
  "以上のように",
  "さらに",
  "加えて",
];

/** 「〜と思う」 남발은 논거가 아니라 인상으로 읽힌다. */
const OPINION_HEDGE = /と思う|と思われる|と考える/g;

function matchesOf(text: string, re: RegExp): string[] {
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  return [...text.matchAll(r)].map((m) => m[0]);
}

/** 문제가 된 표현 주변을 잘라서 보여준다 */
function contextsOf(text: string, re: RegExp, limit = 3): string[] {
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  const out: string[] = [];
  for (const m of text.matchAll(r)) {
    if (m.index === undefined) continue;
    const from = Math.max(0, m.index - 12);
    const to = Math.min(text.length, m.index + m[0].length + 12);
    out.push(`…${text.slice(from, to).replace(/\n/g, " ")}…`);
    if (out.length >= limit) break;
  }
  return out;
}

export function analyzeWriting(text: string): {
  stats: WritingStats;
  checks: WritingCheck[];
  /** fail이 하나도 없고 warn이 2개 이하면 "AI 채점 받아볼 만한 상태"로 본다 */
  readyForGrading: boolean;
} {
  const stats = analyzeStats(text);
  const checks: WritingCheck[] = [];

  // ── 분량 ────────────────────────────────────────────────
  if (stats.chars < MIN_CHARS) {
    checks.push({
      id: "length",
      label: "분량",
      level: "fail",
      detail: `${stats.chars}자 — ${MIN_CHARS}자에 ${MIN_CHARS - stats.chars}자 모자란다. 분량 미달은 내용과 별개로 감점된다.`,
    });
  } else if (stats.chars > MAX_CHARS) {
    checks.push({
      id: "length",
      label: "분량",
      level: "fail",
      detail: `${stats.chars}자 — ${MAX_CHARS}자를 ${stats.chars - MAX_CHARS}자 넘겼다. 초과분은 채점되지 않을 수 있다.`,
    });
  } else {
    checks.push({
      id: "length",
      label: "분량",
      level: "ok",
      detail: `${stats.chars}자 — ${MIN_CHARS}~${MAX_CHARS}자 범위 안이다. (공백 제외 기준)`,
    });
  }

  // ── 문체 통일 ───────────────────────────────────────────
  const polite = matchesOf(text, POLITE_ENDINGS);
  if (polite.length > 0) {
    checks.push({
      id: "style",
      label: "문체 통일",
      level: "fail",
      detail: `です・ます체가 ${polite.length}군데 섞여 있다. 記述는 である체로 통일해야 한다.`,
      samples: contextsOf(text, POLITE_ENDINGS),
    });
  } else if (stats.chars > 50) {
    checks.push({
      id: "style",
      label: "문체 통일",
      level: "ok",
      detail: "である체로 통일되어 있다.",
    });
  }

  // ── 회화체 ──────────────────────────────────────────────
  const casualHits: string[] = [];
  const casualAdvice: string[] = [];
  for (const c of CASUAL_WORDS) {
    const hits = matchesOf(text, c.word);
    if (hits.length > 0) {
      casualHits.push(...hits);
      casualAdvice.push(`${hits[0]} → ${c.better}`);
    }
  }
  if (casualHits.length > 0) {
    checks.push({
      id: "casual",
      label: "회화체",
      level: "warn",
      detail: `구어 표현이 ${casualHits.length}군데 있다. 아카데믹한 표현으로 바꾸자.`,
      samples: casualAdvice.slice(0, 5),
    });
  }

  // ── 단락 ────────────────────────────────────────────────
  if (stats.paragraphs <= 1 && stats.chars >= 200) {
    checks.push({
      id: "paragraph",
      label: "단락 구분",
      level: "warn",
      detail: "전체가 한 덩어리다. 서론·본론·결론으로 2~4단락으로 나누면 구성 점수가 오른다.",
    });
  } else if (stats.paragraphs >= 2) {
    checks.push({
      id: "paragraph",
      label: "단락 구분",
      level: "ok",
      detail: `${stats.paragraphs}단락으로 나뉘어 있다.`,
    });
  }

  // ── 접속 표현 ───────────────────────────────────────────
  const used = CONNECTIVES.filter((c) => text.includes(c));
  if (used.length === 0 && stats.chars >= 200) {
    checks.push({
      id: "connective",
      label: "접속 표현",
      level: "warn",
      detail:
        "접속 표현이 하나도 없다. 「まず」「一方で」「しかし」「したがって」로 문단을 이으면 논지가 따라가기 쉬워진다.",
    });
  } else if (used.length > 0) {
    checks.push({
      id: "connective",
      label: "접속 표현",
      level: "ok",
      detail: `${used.slice(0, 5).join("・")} 등 ${used.length}종 사용.`,
    });
  }

  // ── 문장 길이 ───────────────────────────────────────────
  if (stats.longestSentence >= 120) {
    checks.push({
      id: "sentence",
      label: "문장 길이",
      level: "warn",
      detail: `가장 긴 문장이 ${stats.longestSentence}자다. 80자를 넘으면 주어와 술어가 어긋나기 쉽다. 두 문장으로 끊자.`,
    });
  } else if (stats.sentences > 0) {
    checks.push({
      id: "sentence",
      label: "문장 길이",
      level: "ok",
      detail: `${stats.sentences}문장 · 평균 ${stats.avgSentenceLength}자.`,
    });
  }

  // ── 「〜と思う」 남발 ───────────────────────────────────
  const hedges = matchesOf(text, OPINION_HEDGE);
  if (hedges.length >= 4) {
    checks.push({
      id: "hedge",
      label: "「〜と思う」 반복",
      level: "warn",
      detail: `${hedges.length}번 나온다. 근거를 대는 문장은 단정형(「〜である」「〜からだ」)으로 쓰고, 의견 표명에만 남기자.`,
    });
  }

  const fails = checks.filter((c) => c.level === "fail").length;
  const warns = checks.filter((c) => c.level === "warn").length;

  return { stats, checks, readyForGrading: fails === 0 && warns <= 2 };
}

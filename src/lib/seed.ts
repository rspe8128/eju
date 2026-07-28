import { createDefaultSRS } from "./srs";
import type { AppData, Card, Deck, PlanTarget } from "./types";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_EXAM_PROFILE,
  DEFAULT_SETTINGS,
} from "./types";
import { generateId } from "./utils";
import { toeflExpressions } from "./data/toeflExpressions";
import { CORE2400_CHUNKS } from "./data/toeflCore2400";
import { mathTerms } from "./data/mathTerms";
import { sogoTerms } from "./data/sogoTerms";
import { physicsTerms, chemistryTerms, biologyTerms } from "./data/scienceTerms";
import { writingExpressions, graphExpressions } from "./data/writingExpressions";
import { jlptN5FullWords } from "./data/jlptN5FullWords";
import { jlptN4Words } from "./data/jlptN4Words";
import { jlptN5KanjiWords } from "./data/jlptN5KanjiWords";
import { jlptGrammarPoints } from "./data/jlptGrammar";
import { jlptGrammarN3Points } from "./data/jlptGrammarN3";
import { ejuAcademicVocab } from "./data/ejuAcademicVocab";
import { SUBJECTS, UNITS, ITEMS } from "./data/subjectContent";
import type { WordEntry } from "./data/japaneseWords";

function makeDeck(id: string, subject: string, title: string, type: Deck["type"]): Deck {
  return { id, subject, title, type };
}

export function makeCards(deckId: string, words: WordEntry[]): Card[] {
  return words.map(([front, reading, back, example, notes, tags]) => ({
    id: generateId(),
    deckId,
    front,
    back,
    // 빈 문자열 대신 undefined로 통일한다. 저장 압축(codec.ts)을 거치면 ""와 undefined가
    // 같은 것으로 되돌아오므로, 처음부터 undefined로 맞춰 두어야 왕복이 정확히 일치한다.
    reading: reading || undefined,
    exampleSentence: example || undefined,
    notes: notes || undefined,
    tags: tags ?? [],
    srs: createDefaultSRS(),
  }));
}

export const japaneseDeckId = "deck-jlpt-n5";
export const toeflDeckId = "deck-toefl-basic";
export const toeflExprDeckId = "deck-toefl-expr";
const jlptN5DeckId = "deck-jlpt-n5-full";
const jlptN4DeckId = "deck-jlpt-n4-full";
const jlptN5KanjiDeckId = "deck-jlpt-n5-kanji-full";

export const TOEFL_EXTRA_DECKS: {
  id: string;
  subject: string;
  title: string;
  type: Deck["type"];
  words: WordEntry[];
}[] = [
  {
    id: toeflExprDeckId,
    subject: "toefl",
    title: `TOEFL 작문·스피킹 표현 (${toeflExpressions.length})`,
    type: "grammar",
    words: toeflExpressions,
  },
];

/**
 * TOEFL 핵심 어휘 2400. 한 덱에 2400장을 몰아넣으면 복습 큐가 감당이 안 되므로
 * 300개씩 8개 덱으로 나눠서 "권" 단위로 끊어 학습한다.
 */
export const TOEFL_CORE_DECKS: {
  id: string;
  subject: string;
  title: string;
  type: Deck["type"];
  words: WordEntry[];
}[] = CORE2400_CHUNKS.map((c) => ({
  id: `deck-toefl-core-${c.key}`,
  subject: "toefl",
  title: `TOEFL 핵심어휘 2400 ${c.label}`,
  type: "vocab" as const,
  words: c.words,
}));

export function makeToeflCoreDecks(): { decks: Deck[]; cards: Card[] } {
  const decks: Deck[] = [];
  const cards: Card[] = [];
  for (const d of TOEFL_CORE_DECKS) {
    decks.push(makeDeck(d.id, d.subject, d.title, d.type));
    cards.push(...makeCards(d.id, d.words));
  }
  return { decks, cards };
}

export function makeToeflExtraDecks(): { decks: Deck[]; cards: Card[] } {
  const decks: Deck[] = [];
  const cards: Card[] = [];
  for (const d of TOEFL_EXTRA_DECKS) {
    decks.push(makeDeck(d.id, d.subject, d.title, d.type));
    cards.push(...makeCards(d.id, d.words));
  }
  return { decks, cards };
}

/**
 * EJU 과목별 일본어 전문용어 덱.
 * 기존 사용자 데이터에도 추가되도록 migrate.ts에서 같은 목록을 참조한다.
 */
export const TERM_DECKS: { id: string; subject: string; title: string; words: WordEntry[] }[] = [
  { id: "deck-terms-math", subject: "math", title: "수학 일본어 용어", words: mathTerms },
  { id: "deck-terms-sogo", subject: "sogo", title: "종합과목 일본어 용어", words: sogoTerms },
  { id: "deck-terms-physics", subject: "physics", title: "물리 일본어 용어", words: physicsTerms },
  { id: "deck-terms-chemistry", subject: "chemistry", title: "화학 일본어 용어", words: chemistryTerms },
  { id: "deck-terms-biology", subject: "biology", title: "생물 일본어 용어", words: biologyTerms },
  { id: "deck-writing-expr", subject: "japanese", title: "기술(작문) 정형표현", words: writingExpressions },
  { id: "deck-graph-expr", subject: "japanese", title: "그래프·추이 표현", words: graphExpressions },
];

/** 용어 덱용 기본 학습 플랜 목표 (시험 1주 전 완료 기준) */
export function makeTermPlanTargets(
  deckIds: string[],
  dueDate = "2028-11-05",
  wordCounts?: Record<string, number>
): PlanTarget[] {
  return deckIds.map((deckId) => {
    const words =
      wordCounts?.[deckId] ??
      TERM_DECKS.find((d) => d.id === deckId)?.words.length ??
      JLPT_IMPORTED_DECKS.find((d) => d.id === deckId)?.words.length ??
      JAPANESE_EXTRA_DECKS.find((d) => d.id === deckId)?.words.length ??
      TOEFL_EXTRA_DECKS.find((d) => d.id === deckId)?.words.length ??
      TOEFL_CORE_DECKS.find((d) => d.id === deckId)?.words.length ??
      0;
    return {
      id: `plan-${deckId}`,
      kind: "deck" as const,
      refId: deckId,
      totalUnits: words,
      completedUnits: 0,
      dueDate,
      dailyQuota: 5,
    };
  });
}

export function makeTermDecks(): { decks: Deck[]; cards: Card[] } {
  const decks: Deck[] = [];
  const cards: Card[] = [];
  for (const d of TERM_DECKS) {
    decks.push(makeDeck(d.id, d.subject, d.title, "vocab"));
    cards.push(...makeCards(d.id, d.words));
  }
  return { decks, cards };
}

export const JLPT_IMPORTED_DECKS: { id: string; subject: string; title: string; type: Deck["type"]; words: WordEntry[] }[] = [
  { id: jlptN5DeckId, subject: "japanese", title: "JLPT N5 전체 단어 (574)", type: "vocab", words: jlptN5FullWords },
  { id: jlptN4DeckId, subject: "japanese", title: "JLPT N4 전체 단어 (867)", type: "vocab", words: jlptN4Words },
  { id: jlptN5KanjiDeckId, subject: "japanese", title: "JLPT N5 한자 (775)", type: "kanji", words: jlptN5KanjiWords },
];

export function makeImportedJlptDecks(): { decks: Deck[]; cards: Card[] } {
  const decks: Deck[] = [];
  const cards: Card[] = [];
  for (const d of JLPT_IMPORTED_DECKS) {
    decks.push(makeDeck(d.id, d.subject, d.title, d.type));
    cards.push(...makeCards(d.id, d.words));
  }
  return { decks, cards };
}

/**
 * 일본어 심화 콘텐츠: 문법 포인트 + EJU 독해용 아카데믹 어휘.
 * "문법" 탭이 비어 있던 문제와, JLPT 단어만으로는 채워지지 않는 EJU 독해 어휘 공백을 메운다.
 */
export const JAPANESE_EXTRA_DECKS: { id: string; subject: string; title: string; type: Deck["type"]; words: WordEntry[] }[] = [
  { id: "deck-jlpt-grammar", subject: "japanese", title: "JLPT 초급 문법 (N5~N4)", type: "grammar", words: jlptGrammarPoints },
  { id: "deck-jlpt-grammar-n3", subject: "japanese", title: "JLPT 문법 (N3)", type: "grammar", words: jlptGrammarN3Points },
  { id: "deck-eju-academic-vocab", subject: "japanese", title: "EJU 독해 아카데믹 어휘", type: "vocab", words: ejuAcademicVocab },
];

export function makeJapaneseExtraDecks(): { decks: Deck[]; cards: Card[] } {
  const decks: Deck[] = [];
  const cards: Card[] = [];
  for (const d of JAPANESE_EXTRA_DECKS) {
    decks.push(makeDeck(d.id, d.subject, d.title, d.type));
    cards.push(...makeCards(d.id, d.words));
  }
  return { decks, cards };
}

/**
 * 처음 켰을 때의 데이터.
 *
 * ── 덱과 카드가 비어 있는 이유 ─────────────────────────────────
 * 예전에는 여기서 24개 덱 5,726장을 통째로 넣었다. 그런데 새 카드는 전부
 * "오늘 복습" 대상이라, 앱을 처음 켜자마자 복습할 카드가 수천 장 쌓여 있었다.
 * 무엇부터 해야 할지 알 수 없는 화면이었다.
 *
 * 지금은 단어장 보관함(`/study/library`)에 전부 올려 두고, 담은 것만 들어온다.
 * 단어가 사라진 게 아니다 — 담는 시점이 바뀐 것뿐이다.
 *
 * 아래의 makeTermDecks() 같은 함수들은 지우지 않았다. 예전 버전을 쓰던 사람의
 * 데이터를 올리는 마이그레이션(storage/migrate.ts)이 아직 쓰기 때문이다.
 */
export function getSeedData(): AppData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    decks: [],
    cards: [],
    subjects: SUBJECTS,
    units: UNITS,
    items: ITEMS,
    mistakes: [],
    goals: [
      {
        id: "goal-japanese-week",
        subjectId: "japanese",
        weekStart: new Date().toISOString().split("T")[0],
        targetCount: 50,
        currentCount: 0,
      },
      {
        id: "goal-toefl-week",
        subjectId: "toefl",
        weekStart: new Date().toISOString().split("T")[0],
        targetCount: 30,
        currentCount: 0,
      },
    ],
    // 고1(2026학년도) 학생 기준: 고3(2028.3~2029.2)에 EJU 응시. 정확한 날짜는 시험 약 1년 전에 JASSO가
    // 공식 발표하므로 아래는 최근 3개년 패턴(6월 3주째 일요일 / 11월 2주째 일요일) 기반 추정치다.
    deadlines: [
      { id: "deadline-eju-1-apply", label: "EJU 1차 출원 마감 (추정)", date: "2028-03-10" },
      { id: "deadline-eju-1", label: "EJU 1차 · 고3 1학기 (실전연습 추천, 추정)", date: "2028-06-18" },
      { id: "deadline-eju-2-apply", label: "EJU 2차 출원 마감 (추정)", date: "2028-07-28" },
      { id: "deadline-eju-2", label: "EJU 2차 · 고3 2학기 (목표 시험, 추정)", date: "2028-11-12" },
      { id: "deadline-jlpt", label: "JLPT 12월 회차 (추정)", date: "2028-12-03" },
      { id: "deadline-eju-2-result", label: "EJU 2차 성적 발표 (추정)", date: "2028-12-19" },
      { id: "deadline-enrollment", label: "목표 입학 (4월 입학 기준)", date: "2029-04-01" },
    ],
    studyLogs: [],
    streak: 0,
    lastStudyDate: null,
    examProfile: DEFAULT_EXAM_PROFILE,
    examRecords: [],
    // 기출 정답표 기능은 걷어냈다(모의고사는 정답을 문항 데이터가 직접 들고 있다).
    // 타입과 저장소는 남겨 두었으므로, 나중에 다시 필요해지면 여기만 채우면 된다.
    answerKeys: [],
    examAttempts: [],
    // 덱이 없으니 학습 플랜 목표도 없다. 보관함에서 덱을 담을 때 같이 만들어진다.
    planTargets: [],
    focusSessions: [],
    writingEntries: [],
    dictationEntries: [],
    settings: DEFAULT_SETTINGS,
  };
}

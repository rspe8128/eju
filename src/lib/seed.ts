import { createDefaultSRS } from "./srs";
import type { AppData, Card, Deck, PlanTarget } from "./types";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_EXAM_PROFILE,
  DEFAULT_SETTINGS,
} from "./types";
import { generateId } from "./utils";
import { jlptBasicWords } from "./data/japaneseWords";
import { toeflWords } from "./data/toeflWords";
import { toeflExpressions } from "./data/toeflExpressions";
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
  return words.map(([front, reading, back, example]) => ({
    id: generateId(),
    deckId,
    front,
    back,
    reading,
    exampleSentence: example,
    tags: [],
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

export function getSeedData(): AppData {
  const termDecks = makeTermDecks();
  const importedJlpt = makeImportedJlptDecks();
  const japaneseExtra = makeJapaneseExtraDecks();
  const toeflExtra = makeToeflExtraDecks();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    decks: [
      makeDeck(japaneseDeckId, "japanese", "일본어 기초 단어 100", "vocab"),
      makeDeck(
        toeflDeckId,
        "toefl",
        `TOEFL 아카데믹 단어 (${toeflWords.length})`,
        "vocab"
      ),
      ...toeflExtra.decks,
      ...termDecks.decks,
      ...importedJlpt.decks,
      ...japaneseExtra.decks,
    ],
    cards: [
      ...makeCards(japaneseDeckId, jlptBasicWords),
      ...makeCards(toeflDeckId, toeflWords),
      ...toeflExtra.cards,
      ...termDecks.cards,
      ...importedJlpt.cards,
      ...japaneseExtra.cards,
    ],
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
    planTargets: [
      {
        id: "plan-japanese",
        kind: "deck",
        refId: japaneseDeckId,
        totalUnits: 100,
        completedUnits: 0,
        dueDate: "2028-11-05",
        dailyQuota: 5,
      },
      {
        id: "plan-toefl",
        kind: "deck",
        refId: toeflDeckId,
        totalUnits: toeflWords.length,
        completedUnits: 0,
        dueDate: "2028-11-05",
        dailyQuota: 5,
      },
      ...makeTermPlanTargets(TERM_DECKS.map((d) => d.id)),
      ...makeTermPlanTargets(JLPT_IMPORTED_DECKS.map((d) => d.id)),
      ...makeTermPlanTargets(JAPANESE_EXTRA_DECKS.map((d) => d.id)),
      ...makeTermPlanTargets(TOEFL_EXTRA_DECKS.map((d) => d.id)),
    ],
    focusSessions: [],
    writingEntries: [],
    dictationEntries: [],
    settings: DEFAULT_SETTINGS,
  };
}

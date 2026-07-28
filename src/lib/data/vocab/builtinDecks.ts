import type { WordEntry } from "../japaneseWords";
import type { DeckType } from "../../types";

/**
 * 예전에 앱을 처음 켤 때 자동으로 들어가던 덱들.
 *
 * 이제는 자동으로 넣지 않고 전부 보관함에 올려 둔다. 사용자가 담은 것만 학습 목록에
 * 들어간다. **덱 id와 제목은 예전 그대로 유지한다** — 이미 쓰고 있던 사람의 덱과
 * id가 같아야 보관함에서 "추가됨"으로 인식되고, 복습 진행도가 그대로 이어진다.
 * 그래서 여기 있는 덱은 새 단어들과 달리 400개 단위로 다시 쪼개지 않았다.
 *
 * count는 손으로 적은 값이다. 파일을 열지 않고 목록에 개수를 띄우기 위한 것이고,
 * 실제 배열 길이와 어긋나면 `npm run check:vocab` 이 잡아낸다.
 */

export type BuiltinDeckSpec = {
  id: string;
  subject: string;
  title: string;
  type: DeckType;
  count: number;
  group: string;
  note?: string;
  load: () => Promise<WordEntry[]>;
};

const toeflCoreChunk = (key: string) => async () => {
  const m = await import("../toeflCore2400");
  return m.CORE2400_CHUNKS.find((c) => c.key === key)?.words ?? [];
};

export const BUILTIN_DECKS: BuiltinDeckSpec[] = [
  // ── 일본어 기초 ────────────────────────────────────────────
  {
    id: "deck-jlpt-n5",
    subject: "japanese",
    title: "일본어 기초 단어 100",
    type: "vocab",
    count: 100,
    group: "일본어 기초",
    note: "예문이 붙어 있다. 여기부터 시작하자",
    load: () => import("../japaneseWords").then((m) => m.jlptBasicWords),
  },
  {
    id: "deck-jlpt-n5-full",
    subject: "japanese",
    title: "JLPT N5 전체 단어 (574)",
    type: "vocab",
    count: 574,
    group: "일본어 기초",
    load: () => import("../jlptN5FullWords").then((m) => m.jlptN5FullWords),
  },
  {
    id: "deck-jlpt-n5-kanji-full",
    subject: "japanese",
    title: "JLPT N5 한자 (775)",
    type: "kanji",
    count: 775,
    group: "일본어 기초",
    load: () => import("../jlptN5KanjiWords").then((m) => m.jlptN5KanjiWords),
  },
  {
    id: "deck-jlpt-n4-full",
    subject: "japanese",
    title: "JLPT N4 전체 단어 (867)",
    type: "vocab",
    count: 868,
    group: "일본어 기초",
    load: () => import("../jlptN4Words").then((m) => m.jlptN4Words),
  },

  // ── JLPT 문법 ──────────────────────────────────────────────
  {
    id: "deck-jlpt-grammar",
    subject: "japanese",
    title: "JLPT 초급 문법 (N5~N4)",
    type: "grammar",
    count: 50,
    group: "JLPT 문법",
    load: () => import("../jlptGrammar").then((m) => m.jlptGrammarPoints),
  },
  {
    id: "deck-jlpt-grammar-n3",
    subject: "japanese",
    title: "JLPT 문법 (N3)",
    type: "grammar",
    count: 64,
    group: "JLPT 문법",
    load: () => import("../jlptGrammarN3").then((m) => m.jlptGrammarN3Points),
  },

  // ── EJU 일본어 ─────────────────────────────────────────────
  {
    id: "deck-eju-academic-vocab",
    subject: "japanese",
    title: "EJU 독해 아카데믹 어휘",
    type: "vocab",
    count: 140,
    group: "EJU 일본어",
    note: "독해 지문에 반복해서 나오는 말",
    load: () => import("../ejuAcademicVocab").then((m) => m.ejuAcademicVocab),
  },
  {
    id: "deck-writing-expr",
    subject: "japanese",
    title: "기술(작문) 정형표현",
    type: "vocab",
    count: 45,
    group: "EJU 일본어",
    load: () => import("../writingExpressions").then((m) => m.writingExpressions),
  },
  {
    id: "deck-graph-expr",
    subject: "japanese",
    title: "그래프·추이 표현",
    type: "vocab",
    count: 25,
    group: "EJU 일본어",
    load: () => import("../writingExpressions").then((m) => m.graphExpressions),
  },

  // ── EJU 과목 용어 (기본) ───────────────────────────────────
  {
    id: "deck-terms-math",
    subject: "math",
    title: "수학 일본어 용어",
    type: "vocab",
    count: 83,
    group: "EJU 과목 용어",
    note: "예문이 붙어 있는 기본 용어",
    load: () => import("../mathTerms").then((m) => m.mathTerms),
  },
  {
    id: "deck-terms-sogo",
    subject: "sogo",
    title: "종합과목 일본어 용어",
    type: "vocab",
    count: 79,
    group: "EJU 과목 용어",
    load: () => import("../sogoTerms").then((m) => m.sogoTerms),
  },
  {
    id: "deck-terms-physics",
    subject: "physics",
    title: "물리 일본어 용어",
    type: "vocab",
    count: 79,
    group: "EJU 과목 용어",
    load: () => import("../scienceTerms").then((m) => m.physicsTerms),
  },
  {
    id: "deck-terms-chemistry",
    subject: "chemistry",
    title: "화학 일본어 용어",
    type: "vocab",
    count: 76,
    group: "EJU 과목 용어",
    load: () => import("../scienceTerms").then((m) => m.chemistryTerms),
  },
  {
    id: "deck-terms-biology",
    subject: "biology",
    title: "생물 일본어 용어",
    type: "vocab",
    count: 69,
    group: "EJU 과목 용어",
    load: () => import("../scienceTerms").then((m) => m.biologyTerms),
  },

  // ── TOEFL ──────────────────────────────────────────────────
  {
    id: "deck-toefl-basic",
    subject: "toefl",
    title: "TOEFL 아카데믹 단어 (259)",
    type: "vocab",
    count: 259,
    group: "TOEFL",
    load: () => import("../toeflWords").then((m) => m.toeflWords),
  },
  {
    id: "deck-toefl-expr",
    subject: "toefl",
    title: "TOEFL 작문·스피킹 표현 (40)",
    type: "grammar",
    count: 40,
    group: "TOEFL",
    load: () => import("../toeflExpressions").then((m) => m.toeflExpressions),
  },
  ...["1", "2", "3", "4", "5", "6", "7", "8"].map((key, i) => ({
    id: `deck-toefl-core-${key}`,
    subject: "toefl",
    title: `TOEFL 핵심어휘 2400 ${["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"][i]} ${
      i * 300 + 1
    }~${(i + 1) * 300}`,
    type: "vocab" as DeckType,
    count: 300,
    group: "TOEFL",
    note: i === 0 ? "전체 2,400개를 8권으로 나눴다" : undefined,
    load: toeflCoreChunk(key),
  })),
];

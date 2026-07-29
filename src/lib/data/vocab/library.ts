import type { WordEntry } from "../japaneseWords";
import type { DeckType } from "../../types";
import { VOCAB_COUNTS } from "./manifest";
import { BUILTIN_DECKS } from "./builtinDecks";

/**
 * 단어장 보관함 카탈로그 — 이 앱의 모든 단어장이 여기 모여 있다.
 *
 * ── 왜 자동으로 넣지 않는가 ────────────────────────────────────
 * 1) 복습 큐 — 새로 만든 카드는 전부 "오늘 복습" 대상이다. 만 장이 한꺼번에 들어오면
 *    오늘의 학습 화면이 무의미해진다. 한 권씩 끝내고 다음 권을 담는 쪽이 오래 간다.
 * 2) 저장 공간 — 카드는 localStorage에 쌓인다. 압축(storage/codec.ts) 덕분에 전부
 *    담아도 한도 안에 들어오지만, 안 쓰는 덱까지 이고 다닐 이유는 없다.
 *
 * 예전에는 앱을 처음 켜면 24개 덱 5,726장이 자동으로 들어갔다. 지금은 그것들도
 * 전부 이 목록에 올려 두고(builtinDecks.ts), 담은 것만 학습 목록에 들어간다.
 * **이미 쓰던 사람의 덱은 건드리지 않는다** — id가 같으므로 보관함에서
 * "추가됨"으로 보이고, 빼고 싶으면 직접 빼면 된다.
 *
 * 목록 화면은 개수만 읽는다. 실제 단어는 '추가'를 누르는 순간 동적 import 로
 * 가져오므로, 구경만 할 때는 수백 KB를 받지 않는다.
 */

export type LibraryDeck = {
  /** AppData.decks 에 들어갈 id */
  id: string;
  subject: string;
  title: string;
  type: DeckType;
  /** 단어 수 — 파일을 열지 않고 목록에 표시하기 위해 미리 계산해 둔 값 */
  count: number;
  /** 목록에서 묶어 보여줄 그룹 */
  group: string;
  /** 그룹 안에서의 부가 설명 */
  note?: string;
  /** 실제 단어. 추가할 때만 호출된다. */
  load: () => Promise<WordEntry[]>;
};

/** 한 덱에 넣을 목표 단어 수. 이보다 많으면 잘라서 여러 권으로 만든다. */
const CHUNK = 400;

function partsOf(total: number): number {
  return Math.max(1, Math.ceil(total / CHUNK));
}

/** 균등 분할 — 마지막 권만 유난히 작아지지 않도록 올림으로 나눈다. */
function chunkRange(total: number, index: number): [number, number] {
  const base = Math.ceil(total / partsOf(total));
  return [index * base, Math.min(total, (index + 1) * base)];
}

function jlptLevelDecks(
  level: "N3" | "N2" | "N1",
  total: number,
  loadAll: () => Promise<WordEntry[]>
): LibraryDeck[] {
  const parts = partsOf(total);
  return Array.from({ length: parts }, (_, i) => {
    const [from, to] = chunkRange(total, i);
    return {
      id: `deck-jlpt-${level.toLowerCase()}-part-${String(i + 1).padStart(2, "0")}`,
      subject: "japanese",
      title: `JLPT ${level} 단어 ${i + 1}/${parts}`,
      type: "vocab" as DeckType,
      count: to - from,
      group: `JLPT ${level}`,
      note: i === 0 ? `전체 ${total.toLocaleString()}개를 ${parts}권으로 나눴다` : undefined,
      load: async () => (await loadAll()).slice(from, to),
    };
  });
}

const loadN3 = () => import("./jlptN3Words").then((m) => m.jlptN3Words);
const loadN2 = () => import("./jlptN2Words").then((m) => m.jlptN2Words);
const loadN1 = () => import("./jlptN1Words").then((m) => m.jlptN1Words);

const SUBJECT_DECKS: {
  key: "ejuMathVocab" | "ejuPhysicsVocab" | "ejuChemistryVocab" | "ejuBiologyVocab" | "ejuSogoVocab";
  id: string;
  subject: string;
  label: string;
  load: () => Promise<WordEntry[]>;
}[] = [
  {
    key: "ejuMathVocab",
    id: "deck-terms-math-ext",
    subject: "math",
    label: "수학",
    load: () => import("./ejuSubjectVocab").then((m) => m.ejuMathVocab),
  },
  {
    key: "ejuPhysicsVocab",
    id: "deck-terms-physics-ext",
    subject: "physics",
    label: "물리",
    load: () => import("./ejuSubjectVocab").then((m) => m.ejuPhysicsVocab),
  },
  {
    key: "ejuChemistryVocab",
    id: "deck-terms-chemistry-ext",
    subject: "chemistry",
    label: "화학",
    load: () => import("./ejuSubjectVocab").then((m) => m.ejuChemistryVocab),
  },
  {
    key: "ejuBiologyVocab",
    id: "deck-terms-biology-ext",
    subject: "biology",
    label: "생물",
    load: () => import("./ejuSubjectVocab").then((m) => m.ejuBiologyVocab),
  },
  {
    key: "ejuSogoVocab",
    id: "deck-terms-sogo-ext",
    subject: "sogo",
    label: "종합과목",
    load: () => import("./ejuSubjectVocab").then((m) => m.ejuSogoVocab),
  },
];

const ALL_DECKS: LibraryDeck[] = [
  ...BUILTIN_DECKS,
  ...jlptLevelDecks("N3", VOCAB_COUNTS.jlptN3, loadN3),
  ...jlptLevelDecks("N2", VOCAB_COUNTS.jlptN2, loadN2),
  ...jlptLevelDecks("N1", VOCAB_COUNTS.jlptN1, loadN1),
  ...SUBJECT_DECKS.map((d) => ({
    id: d.id,
    subject: d.subject,
    title: `${d.label} 용어 확장 (${VOCAB_COUNTS[d.key].toLocaleString()})`,
    type: "vocab" as DeckType,
    count: VOCAB_COUNTS[d.key],
    group: "EJU 과목 용어",
    note: "기본 용어 덱에 없는 것만 모았다",
    load: d.load,
  })),
];

/**
 * 화면에 보여줄 순서. 공부하는 순서대로 놓았다.
 * 여기 없는 그룹이 생기면 맨 뒤에 붙는다(빠뜨려도 사라지지는 않게).
 */
const GROUP_ORDER = [
  "일본어 기초",
  "JLPT 문법",
  "JLPT N3",
  "JLPT N2",
  "JLPT N1",
  "EJU 일본어",
  "EJU 과목 용어",
  "TOEFL",
];

function groupRank(group: string): number {
  const i = GROUP_ORDER.indexOf(group);
  return i === -1 ? GROUP_ORDER.length : i;
}

export const LIBRARY_DECKS: LibraryDeck[] = [...ALL_DECKS].sort(
  (a, b) => groupRank(a.group) - groupRank(b.group)
);

export function getLibraryDeck(id: string): LibraryDeck | undefined {
  return LIBRARY_DECKS.find((d) => d.id === id);
}

/** 목록 화면에서 쓸 그룹 묶음 */
export function libraryGroups(): { group: string; decks: LibraryDeck[] }[] {
  const out: { group: string; decks: LibraryDeck[] }[] = [];
  for (const d of LIBRARY_DECKS) {
    const last = out[out.length - 1];
    if (last && last.group === d.group) last.decks.push(d);
    else out.push({ group: d.group, decks: [d] });
  }
  return out;
}

/**
 * 보관함 탭.
 *
 * 그룹이 8개, 덱이 40권을 넘어가서 한 화면에 다 쌓으면 원하는 걸 찾기 어렵다.
 * 그룹을 그대로 탭으로 만들면 탭이 8개라 그것대로 복잡하므로, 성격이 같은
 * 그룹끼리 묶어 4개로 줄였다. 탭 안에서는 기존 그룹 구분이 그대로 남는다.
 */
export const LIBRARY_CATEGORIES: { id: string; label: string; groups: string[] }[] = [
  { id: "basic", label: "기초 · 문법", groups: ["일본어 기초", "JLPT 문법"] },
  { id: "jlpt", label: "JLPT 단어", groups: ["JLPT N3", "JLPT N2", "JLPT N1"] },
  { id: "eju", label: "EJU", groups: ["EJU 일본어", "EJU 과목 용어"] },
  { id: "toefl", label: "TOEFL", groups: ["TOEFL"] },
];

/** 어느 탭에도 안 들어간 그룹은 마지막 탭에 붙인다(새 그룹이 생겨도 사라지지 않게). */
export function categoryOfGroup(group: string): string {
  const hit = LIBRARY_CATEGORIES.find((c) => c.groups.includes(group));
  return hit?.id ?? LIBRARY_CATEGORIES[LIBRARY_CATEGORIES.length - 1].id;
}

export const LIBRARY_TOTAL = LIBRARY_DECKS.reduce((n, d) => n + d.count, 0);

/**
 * 카드 한 장이 localStorage에서 차지하는 대략적인 문자 수 (압축 후 실측 평균).
 * 정확한 값이 아니라 "이 덱을 넣으면 얼마나 늘어나는지" 감을 주기 위한 추정치다.
 * 압축 방식은 src/lib/storage/codec.ts 참고.
 */
export const APPROX_CHARS_PER_CARD = 105;

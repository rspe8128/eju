import type { AppData, Card, Deck, Item, StudyLog, Subject, Unit } from "../types";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_EXAM_PROFILE,
  DEFAULT_SETTINGS,
} from "../types";
import {
  makeCards,
  makeImportedJlptDecks,
  makeJapaneseExtraDecks,
  makeTermDecks,
  makeTermPlanTargets,
  TERM_DECKS,
  JLPT_IMPORTED_DECKS,
  JAPANESE_EXTRA_DECKS,
  TOEFL_EXTRA_DECKS,
  makeToeflExtraDecks,
  TOEFL_CORE_DECKS,
  makeToeflCoreDecks,
  japaneseDeckId,
  toeflDeckId,
} from "../seed";
import { SUBJECTS, UNITS, ITEMS } from "../data/subjectContent";
import { jlptBasicWords, type WordEntry } from "../data/japaneseWords";
import { toeflWords } from "../data/toeflWords";
import { mergeBuiltinAnswerKeys } from "../data/ejuAnswerKeys2018_1";

type Loose = Record<string, unknown>;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function ensureStudyLogs(logs: unknown): StudyLog[] {
  return asArray<Loose>(logs).map((log) => ({
    date: String(log.date ?? ""),
    subjectId: String(log.subjectId ?? ""),
    count: Number(log.count ?? 0),
    correct: Number(log.correct ?? 0),
    wrong: Number(log.wrong ?? 0),
  }));
}

/** 누락 필드를 기본값으로 채운다. 버전 번호는 건드리지 않는다. */
function fillDefaults(raw: Loose, version: number): AppData {
  return {
    schemaVersion: version,
    decks: asArray(raw.decks),
    cards: asArray(raw.cards),
    subjects: asArray(raw.subjects),
    units: asArray(raw.units),
    items: asArray(raw.items),
    mistakes: asArray(raw.mistakes),
    goals: asArray(raw.goals),
    deadlines: asArray(raw.deadlines),
    studyLogs: ensureStudyLogs(raw.studyLogs),
    streak: Number(raw.streak ?? 0),
    lastStudyDate: (raw.lastStudyDate as string | null) ?? null,
    examProfile: (raw.examProfile as AppData["examProfile"]) ?? DEFAULT_EXAM_PROFILE,
    examRecords: asArray(raw.examRecords),
    answerKeys: asArray(raw.answerKeys),
    examAttempts: asArray(raw.examAttempts),
    planTargets: asArray(raw.planTargets),
    focusSessions: asArray(raw.focusSessions),
    writingEntries: asArray(raw.writingEntries),
    dictationEntries: asArray(raw.dictationEntries),
    settings: {
      ...DEFAULT_SETTINGS,
      ...(typeof raw.settings === "object" && raw.settings ? (raw.settings as object) : {}),
    },
  };
}

/**
 * v2: EJU 과목별 일본어 전문용어 덱을 추가한다.
 * 이미 같은 id의 덱이 있으면 건너뛰므로 사용자가 지운 덱을 되살리지는 않는다.
 */
function migrateToV2(data: AppData): AppData {
  const { decks, cards } = makeTermDecks();
  const existingDeckIds = new Set(data.decks.map((d) => d.id));
  const newDecks: Deck[] = decks.filter((d) => !existingDeckIds.has(d.id));
  const newDeckIds = new Set(newDecks.map((d) => d.id));
  const newCards: Card[] = cards.filter((c) => newDeckIds.has(c.deckId));

  const existingPlanIds = new Set(data.planTargets.map((p) => p.id));
  const newPlans = makeTermPlanTargets(
    newDecks.map((d) => d.id),
    data.examProfile?.examDate ?? "2028-11-05"
  ).filter((p) => !existingPlanIds.has(p.id));

  return {
    ...data,
    schemaVersion: 2,
    decks: [...data.decks, ...newDecks],
    cards: [...data.cards, ...newCards],
    planTargets: [...data.planTargets, ...newPlans],
  };
}

/**
 * v3: JLPT_N5 사이트 자료 기반 덱(N5/N4/한자)을 기본 데이터로 추가한다.
 */
function migrateToV3(data: AppData): AppData {
  const { decks, cards } = makeImportedJlptDecks();
  const existingDeckIds = new Set(data.decks.map((d) => d.id));
  const newDecks: Deck[] = decks.filter((d) => !existingDeckIds.has(d.id));
  const newDeckIds = new Set(newDecks.map((d) => d.id));
  const newCards: Card[] = cards.filter((c) => newDeckIds.has(c.deckId));

  const existingPlanIds = new Set(data.planTargets.map((p) => p.id));
  const newPlans = makeTermPlanTargets(
    newDecks.map((d) => d.id),
    data.examProfile?.examDate ?? "2028-11-05"
  ).filter((p) => !existingPlanIds.has(p.id));

  return {
    ...data,
    schemaVersion: 3,
    decks: [...data.decks, ...newDecks],
    cards: [...data.cards, ...newCards],
    planTargets: [...data.planTargets, ...newPlans],
  };
}

/**
 * v4: 일본어 문법 덱 + EJU 독해 아카데믹 어휘 덱을 추가한다.
 */
function migrateToV4(data: AppData): AppData {
  const { decks, cards } = makeJapaneseExtraDecks();
  const existingDeckIds = new Set(data.decks.map((d) => d.id));
  const newDecks: Deck[] = decks.filter((d) => !existingDeckIds.has(d.id));
  const newDeckIds = new Set(newDecks.map((d) => d.id));
  const newCards: Card[] = cards.filter((c) => newDeckIds.has(c.deckId));

  const existingPlanIds = new Set(data.planTargets.map((p) => p.id));
  const newPlans = makeTermPlanTargets(
    newDecks.map((d) => d.id),
    data.examProfile?.examDate ?? "2028-11-05"
  ).filter((p) => !existingPlanIds.has(p.id));

  return {
    ...data,
    schemaVersion: 4,
    decks: [...data.decks, ...newDecks],
    cards: [...data.cards, ...newCards],
    planTargets: [...data.planTargets, ...newPlans],
  };
}

/**
 * v5: 교과목(수학·종합과목) 단원/문제를 확장하고, 물리·화학·생물을 실제 과목(Subject)으로 추가한다.
 * 기존에 있던 subject/unit/item은 id 기준으로 건드리지 않고, 없는 것만 추가한다.
 */
function migrateToV5(data: AppData): AppData {
  const existingSubjectIds = new Set(data.subjects.map((s) => s.id));
  const newSubjects: Subject[] = SUBJECTS.filter((s) => !existingSubjectIds.has(s.id));

  const existingUnitIds = new Set(data.units.map((u) => u.id));
  const newUnits: Unit[] = UNITS.filter((u) => !existingUnitIds.has(u.id));

  const existingItemIds = new Set(data.items.map((i) => i.id));
  const newItems: Item[] = ITEMS.filter((i) => !existingItemIds.has(i.id));

  return {
    ...data,
    schemaVersion: 5,
    subjects: [...data.subjects, ...newSubjects],
    units: [...data.units, ...newUnits],
    items: [...data.items, ...newItems],
  };
}

/**
 * v6: 기존에 이미 존재하는 단어 덱(물리·화학·생물 용어, EJU 아카데믹 어휘, 토플, 기초 일본어 등)에
 * 새로 추가된 단어만 골라 카드로 채워 넣는다. 덱 자체는 v2~v4에서 이미 생성됐으므로, 여기서는
 * "front(단어) 기준으로 없는 카드만 추가"하는 방식으로 사용자가 이미 진행한 SRS 기록은 건드리지 않는다.
 */
function syncMissingCards(existingCards: Card[], deckId: string, words: WordEntry[]): Card[] {
  const existingFronts = new Set(
    existingCards.filter((c) => c.deckId === deckId).map((c) => c.front)
  );
  const missingWords = words.filter(([front]) => !existingFronts.has(front));
  return missingWords.length > 0 ? makeCards(deckId, missingWords) : [];
}

function migrateToV6(data: AppData): AppData {
  const wordListsByDeck: { deckId: string; words: WordEntry[] }[] = [
    { deckId: japaneseDeckId, words: jlptBasicWords },
    { deckId: toeflDeckId, words: toeflWords },
    ...TERM_DECKS.map((d) => ({ deckId: d.id, words: d.words })),
    ...JLPT_IMPORTED_DECKS.map((d) => ({ deckId: d.id, words: d.words })),
    ...JAPANESE_EXTRA_DECKS.map((d) => ({ deckId: d.id, words: d.words })),
  ];

  const existingDeckIds = new Set(data.decks.map((d) => d.id));
  const newCards: Card[] = [];
  for (const { deckId, words } of wordListsByDeck) {
    // 덱 자체가 없는 경우(아주 예전 데이터 등)는 이전 마이그레이션이 처리하므로 여기서는 건너뛴다.
    if (!existingDeckIds.has(deckId)) continue;
    newCards.push(...syncMissingCards(data.cards, deckId, words));
  }

  return {
    ...data,
    schemaVersion: 6,
    cards: [...data.cards, ...newCards],
  };
}

/**
 * v7: TOEFL 덱 제목을 실제 단어 수에 맞게 고치고, 작문·스피킹 표현 덱을 추가한다.
 */
function migrateToV7(data: AppData): AppData {
  const { decks: extraDecks, cards: extraCards } = makeToeflExtraDecks();
  const existingDeckIds = new Set(data.decks.map((d) => d.id));
  const newDecks = extraDecks.filter((d) => !existingDeckIds.has(d.id));
  const newDeckIds = new Set(newDecks.map((d) => d.id));
  const newCards = extraCards.filter((c) => newDeckIds.has(c.deckId));

  const decks = data.decks.map((d) =>
    d.id === toeflDeckId
      ? { ...d, title: `TOEFL 아카데믹 단어 (${toeflWords.length})` }
      : d
  );

  const existingPlanIds = new Set(data.planTargets.map((p) => p.id));
  const newPlans = makeTermPlanTargets(TOEFL_EXTRA_DECKS.map((d) => d.id)).filter(
    (p) => !existingPlanIds.has(p.id)
  );

  // 표현 덱이 이미 있으면 누락 카드만 채움
  const fillCards: Card[] = [];
  for (const d of TOEFL_EXTRA_DECKS) {
    if (!existingDeckIds.has(d.id)) continue;
    fillCards.push(...syncMissingCards(data.cards, d.id, d.words));
  }
  fillCards.push(...syncMissingCards([...data.cards, ...newCards], toeflDeckId, toeflWords));

  return {
    ...data,
    schemaVersion: 7,
    decks: [...decks, ...newDecks],
    cards: [...data.cards, ...newCards, ...fillCards],
    planTargets: [...data.planTargets, ...newPlans],
    settings: {
      ...DEFAULT_SETTINGS,
      ...data.settings,
    },
  };
}

/**
 * v8: JLPT N3 문법 덱을 추가한다. (deck-jlpt-grammar-n3)
 * JAPANESE_EXTRA_DECKS에 이미 등록되어 있으므로, 아직 없는 덱/카드만 채운다.
 */
function migrateToV8(data: AppData): AppData {
  const { decks: extraDecks, cards: extraCards } = makeJapaneseExtraDecks();
  const existingDeckIds = new Set(data.decks.map((d) => d.id));
  const newDecks = extraDecks.filter((d) => !existingDeckIds.has(d.id));
  const newDeckIds = new Set(newDecks.map((d) => d.id));
  const newCards = extraCards.filter((c) => newDeckIds.has(c.deckId));

  const existingPlanIds = new Set(data.planTargets.map((p) => p.id));
  const newPlans = makeTermPlanTargets(newDecks.map((d) => d.id)).filter(
    (p) => !existingPlanIds.has(p.id)
  );

  // 덱이 이미 있는 경우(예: v4에서 이미 생성된 이후 사용자가 계속 쓰던 경우)에도
  // 새로 추가된 문법 항목이 있으면 누락 카드만 채운다.
  const fillCards: Card[] = [];
  for (const d of JAPANESE_EXTRA_DECKS) {
    if (!existingDeckIds.has(d.id)) continue;
    fillCards.push(...syncMissingCards(data.cards, d.id, d.words));
  }

  return {
    ...data,
    schemaVersion: 8,
    decks: [...data.decks, ...newDecks],
    cards: [...data.cards, ...newCards, ...fillCards],
    planTargets: [...data.planTargets, ...newPlans],
  };
}

/**
 * v9: TOEFL 핵심어휘 2400 덱(300개씩 8권)을 추가한다.
 * 이미 있는 덱은 건드리지 않고, 없는 덱/카드만 추가하므로 기존 SRS 기록은 그대로 유지된다.
 */
function migrateToV9(data: AppData): AppData {
  const { decks: coreDecks, cards: coreCards } = makeToeflCoreDecks();
  const existingDeckIds = new Set(data.decks.map((d) => d.id));
  const newDecks = coreDecks.filter((d) => !existingDeckIds.has(d.id));
  const newDeckIds = new Set(newDecks.map((d) => d.id));
  const newCards = coreCards.filter((c) => newDeckIds.has(c.deckId));

  const existingPlanIds = new Set(data.planTargets.map((p) => p.id));
  const newPlans = makeTermPlanTargets(
    newDecks.map((d) => d.id),
    data.examProfile?.examDate ?? "2028-11-05"
  ).filter((p) => !existingPlanIds.has(p.id));

  // 덱이 이미 있는데 단어만 늘어난 경우를 대비해 누락 카드도 채운다.
  const fillCards: Card[] = [];
  for (const d of TOEFL_CORE_DECKS) {
    if (!existingDeckIds.has(d.id)) continue;
    fillCards.push(...syncMissingCards(data.cards, d.id, d.words));
  }

  return {
    ...data,
    schemaVersion: 9,
    decks: [...data.decks, ...newDecks],
    cards: [...data.cards, ...newCards, ...fillCards],
    planTargets: [...data.planTargets, ...newPlans],
  };
}

/**
 * v10: 기출 응시 기록(examAttempts)과 정답표(answerKeys) 저장소를 추가한다.
 * 기존 데이터는 건드리지 않고 빈 배열만 붙인다.
 */
function migrateToV10(data: AppData): AppData {
  return {
    ...data,
    schemaVersion: 10,
    answerKeys: data.answerKeys ?? [],
    examAttempts: data.examAttempts ?? [],
  };
}

/**
 * v11: JASSO 2018년 1회 공식 정답표를 내장한다.
 * 사용자가 이미 등록한 같은 id 정답표는 덮어쓰지 않는다.
 */
function migrateToV11(data: AppData): AppData {
  return {
    ...data,
    schemaVersion: 11,
    answerKeys: mergeBuiltinAnswerKeys(data.answerKeys ?? []),
  };
}

const migrations: Record<number, (d: Loose) => Loose> = {
  0: (d) => fillDefaults(d, 1) as unknown as Loose,
  1: (d) => migrateToV2(d as unknown as AppData) as unknown as Loose,
  2: (d) => migrateToV3(d as unknown as AppData) as unknown as Loose,
  3: (d) => migrateToV4(d as unknown as AppData) as unknown as Loose,
  4: (d) => migrateToV5(d as unknown as AppData) as unknown as Loose,
  5: (d) => migrateToV6(d as unknown as AppData) as unknown as Loose,
  6: (d) => migrateToV7(d as unknown as AppData) as unknown as Loose,
  7: (d) => migrateToV8(d as unknown as AppData) as unknown as Loose,
  8: (d) => migrateToV9(d as unknown as AppData) as unknown as Loose,
  9: (d) => migrateToV10(d as unknown as AppData) as unknown as Loose,
  10: (d) => migrateToV11(d as unknown as AppData) as unknown as Loose,
};

export function migrate(raw: unknown): AppData {
  let data: Loose =
    typeof raw === "object" && raw !== null ? ({ ...(raw as Loose) } as Loose) : {};

  let version =
    typeof data.schemaVersion === "number" ? (data.schemaVersion as number) : 0;

  while (version < CURRENT_SCHEMA_VERSION) {
    const fn = migrations[version];
    if (!fn) break;
    data = fn(data);
    version =
      typeof data.schemaVersion === "number"
        ? (data.schemaVersion as number)
        : version + 1;
  }

  // 최종 방어: 누락 필드 채우기 (버전은 유지)
  return fillDefaults(data, Math.max(version, CURRENT_SCHEMA_VERSION));
}

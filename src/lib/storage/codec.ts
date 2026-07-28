import type { AppData, Card } from "../types";
import { createDefaultSRS } from "../srs";

/**
 * 카드 저장 포맷 압축.
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────
 * 카드 한 장을 그대로 JSON으로 쓰면 259자쯤 된다. 그런데 그중 실제 내용
 * (단어·뜻·읽기)은 30자 안팎이고, 나머지는 전부 반복되는 키 이름과 deckId다.
 *
 *   {"id":"…","deckId":"deck-jlpt-n1-part-01","front":"愛想","back":"붙임성",
 *    "reading":"あいそ","tags":[],"srs":{"easeFactor":2.5,"interval":0,
 *    "repetitions":0,"nextReviewDate":"2026-07-28"}}
 *
 * localStorage는 문자당 2바이트(UTF-16)로 계산되고 Safari 한도가 5MB라,
 * 단어를 만 장 넘게 넣으면 그대로는 한도를 넘긴다.
 *
 * 그래서 저장할 때만 (1) 덱별로 묶어 deckId 반복을 없애고 (2) 키 이름을 빼고
 * 배열 순서로 표현한다. 카드당 259자 → 105자, 약 60% 절감된다.
 *
 * ── 중요 ───────────────────────────────────────────────────────
 * **카드 id는 그대로 저장한다.** 오답노트(mistakes)가 카드 id를 참조하기 때문에,
 * id를 버리고 나중에 다시 만들면 오답 기록이 통째로 끊긴다. id를 빼면 20자를 더
 * 줄일 수 있지만 그 위험을 살 이유가 없다.
 *
 * 앱 안에서는 예전과 똑같은 Card 객체를 쓴다. 압축은 저장 직전/직후에만 일어난다.
 */

/** [id, front, back, reading, example, notes, tags, easeFactor, interval, repetitions, due, lapses, reviews] */
type CardTuple = [
  string,
  string,
  string,
  string,
  string,
  string,
  string[] | 0,
  number,
  number,
  number,
  string,
  number?,
  number?,
];

type CardGroup = [deckId: string, cards: CardTuple[]];

/** localStorage에 실제로 들어가는 모양 */
export type StoredData = Omit<AppData, "cards"> & {
  /** 압축 포맷. 이게 있으면 cards는 없다. */
  cardsV2?: CardGroup[];
  /** 예전 포맷(압축 이전에 저장된 데이터) */
  cards?: Card[];
};

export function encodeData(data: AppData): StoredData {
  const groups = new Map<string, CardTuple[]>();
  for (const c of data.cards) {
    let list = groups.get(c.deckId);
    if (!list) {
      list = [];
      groups.set(c.deckId, list);
    }
    const t: CardTuple = [
      c.id,
      c.front,
      c.back,
      c.reading ?? "",
      c.exampleSentence ?? "",
      c.notes ?? "",
      c.tags && c.tags.length > 0 ? c.tags : 0,
      c.srs.easeFactor,
      c.srs.interval,
      c.srs.repetitions,
      c.srs.nextReviewDate,
    ];
    // lapses·reviews는 학습을 시작한 카드에만 붙는다. 없으면 아예 안 쓴다.
    if (c.srs.lapses !== undefined || c.srs.reviews !== undefined) {
      t.push(c.srs.lapses ?? 0, c.srs.reviews ?? 0);
    }
    list.push(t);
  }

  const rest = { ...data } as Omit<AppData, "cards"> & { cards?: Card[] };
  delete rest.cards;
  return { ...rest, cardsV2: [...groups.entries()] };
}

function tupleToCard(deckId: string, t: CardTuple): Card {
  const [id, front, back, reading, example, notes, tags, ef, interval, reps, due, lapses, reviews] =
    t;
  const srs = {
    ...createDefaultSRS(),
    easeFactor: ef,
    interval,
    repetitions: reps,
    nextReviewDate: due,
  };
  if (lapses !== undefined) srs.lapses = lapses;
  if (reviews !== undefined) srs.reviews = reviews;
  return {
    id,
    deckId,
    front,
    back,
    reading: reading || undefined,
    exampleSentence: example || undefined,
    notes: notes || undefined,
    tags: tags === 0 || !tags ? [] : tags,
    srs,
  };
}

/**
 * 저장된 값을 앱이 쓰는 모양으로 되돌린다.
 * 예전 포맷(cards 배열)도 그대로 읽히므로, 기존 사용자 데이터는 손대지 않아도 된다.
 */
export function decodeData(stored: unknown): unknown {
  if (!stored || typeof stored !== "object") return stored;
  const s = stored as StoredData;
  if (!Array.isArray(s.cardsV2)) return stored;

  const cards: Card[] = [];
  for (const group of s.cardsV2) {
    if (!Array.isArray(group) || group.length < 2) continue;
    const [deckId, tuples] = group;
    if (!Array.isArray(tuples)) continue;
    for (const t of tuples) {
      if (!Array.isArray(t) || t.length < 11) continue;
      cards.push(tupleToCard(deckId, t));
    }
  }

  const out = { ...s, cards } as Record<string, unknown>;
  delete out.cardsV2;
  return out;
}

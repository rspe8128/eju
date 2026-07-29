import type { CardSRS, SRSRating } from "./types";

export function createDefaultSRS(): CardSRS {
  return {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString().split("T")[0],
    lapses: 0,
    reviews: 0,
  };
}

export function updateSRS(current: CardSRS, rating: SRSRating): CardSRS {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let { easeFactor, interval, repetitions } = current;

  if (rating === 1) {
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (rating === 2) {
    repetitions = Math.max(0, repetitions);
    interval = Math.max(1, Math.round(interval * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    easeFactor = Math.min(3.0, easeFactor + 0.1);
  }

  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate: nextDate.toISOString().split("T")[0],
    lapses: (current.lapses ?? 0) + (rating === 1 ? 1 : 0),
    reviews: (current.reviews ?? 0) + 1,
  };
}

export function isDueForReview(srs: CardSRS, date = new Date()): boolean {
  const today = date.toISOString().split("T")[0];
  return srs.nextReviewDate <= today;
}

export function getDueCards<T extends { srs: CardSRS }>(cards: T[], date = new Date()): T[] {
  return cards.filter((card) => isDueForReview(card.srs, date));
}

/**
 * 몇 번 이상 틀리면 "잘 안 외워지는 카드"로 볼지.
 *
 * 간격 반복만 믿으면 이런 카드는 틀릴 때마다 간격이 1일로 돌아가 영원히 같은 자리를
 * 맴돈다(SRS에서 leech라고 부른다). 따로 모아서 집중적으로 돌려야 빠져나온다.
 */
export const LEECH_LAPSES = 3;

/** 자주 틀린 카드를 많이 틀린 순으로. */
export function getLeechCards<T extends { srs: CardSRS }>(
  cards: T[],
  minLapses = LEECH_LAPSES
): T[] {
  return cards
    .filter((c) => (c.srs.lapses ?? 0) >= minLapses)
    .sort((a, b) => (b.srs.lapses ?? 0) - (a.srs.lapses ?? 0));
}

/**
 * 앞으로 며칠 동안 며 장이 복습 대상으로 올라오는지.
 * 이미 밀린 카드(오늘 이전)는 첫날에 합산한다 — 어차피 오늘 봐야 하기 때문이다.
 */
export function getReviewForecast<T extends { srs: CardSRS }>(
  cards: T[],
  days = 14,
  from = new Date()
): { date: string; count: number }[] {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);

  const out: { date: string; count: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push({ date: toKey(d), count: 0 });
  }

  const index = new Map(out.map((slot, i) => [slot.date, i]));
  const todayKey = out[0].date;
  const lastKey = out[out.length - 1].date;

  for (const card of cards) {
    const due = card.srs.nextReviewDate;
    if (!due || due > lastKey) continue;
    const key = due < todayKey ? todayKey : due;
    const i = index.get(key);
    if (i !== undefined) out[i].count += 1;
  }
  return out;
}

/** 로컬 기준 YYYY-MM-DD (UTC로 바꾸면 새벽에 하루가 밀린다) */
function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

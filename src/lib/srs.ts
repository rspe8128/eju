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

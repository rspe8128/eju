import type { Card, CardSRS } from "./types";

export type MasteryLevel = "new" | "learning" | "review" | "mastered";

export const MASTERY_COLORS: Record<MasteryLevel, string> = {
  new: "#a1a1aa",
  learning: "#f59e0b",
  review: "#3b82f6",
  mastered: "#22c55e",
};

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  new: "신규",
  learning: "학습중",
  review: "복습",
  mastered: "숙련",
};

export function getMasteryLevel(srs: CardSRS): MasteryLevel {
  if (srs.repetitions === 0) return "new";
  if (srs.repetitions <= 2) return "learning";
  if (srs.repetitions <= 5) return "review";
  if (srs.repetitions >= 6 && srs.easeFactor >= 2.5) return "mastered";
  return "review";
}

export function getMasteryDistribution(cards: Card[]): Record<MasteryLevel, number> {
  const dist: Record<MasteryLevel, number> = {
    new: 0,
    learning: 0,
    review: 0,
    mastered: 0,
  };
  for (const card of cards) {
    dist[getMasteryLevel(card.srs)] += 1;
  }
  return dist;
}

export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

import type { AppData, Card, Deck } from "./types";
import { getMasteryDistribution, type MasteryLevel } from "./progress";

export type DeckStat = {
  deck: Deck;
  total: number;
  studied: number;
  accuracy: number | null;
  lapses: number;
  mastery: Record<MasteryLevel, number>;
};

/** 덱별 학습 현황 + 정답률 (정답률 = 1 - 오답/총학습) */
export function getDeckStats(data: AppData): DeckStat[] {
  return data.decks
    .map((deck) => {
      const cards = data.cards.filter((c) => c.deckId === deck.id);
      const reviews = cards.reduce((s, c) => s + (c.srs.reviews ?? 0), 0);
      const lapses = cards.reduce((s, c) => s + (c.srs.lapses ?? 0), 0);
      return {
        deck,
        total: cards.length,
        studied: cards.filter((c) => (c.srs.reviews ?? 0) > 0).length,
        accuracy: reviews > 0 ? Math.round(((reviews - lapses) / reviews) * 100) : null,
        lapses,
        mastery: getMasteryDistribution(cards),
      };
    })
    .filter((s) => s.total > 0);
}

/** 자주 틀리는 카드 순위 */
export function getWeakCards(data: AppData, limit = 10): (Card & { deckTitle: string })[] {
  return [...data.cards]
    .filter((c) => (c.srs.lapses ?? 0) > 0)
    .sort((a, b) => {
      const diff = (b.srs.lapses ?? 0) - (a.srs.lapses ?? 0);
      if (diff !== 0) return diff;
      return a.srs.easeFactor - b.srs.easeFactor;
    })
    .slice(0, limit)
    .map((c) => ({
      ...c,
      deckTitle: data.decks.find((d) => d.id === c.deckId)?.title ?? "-",
    }));
}

export type DailyStat = { date: string; label: string; count: number; correct: number; wrong: number };

/** 최근 N일 일별 학습량 */
export function getDailyStats(data: AppData, days = 14): DailyStat[] {
  const result: DailyStat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const logs = data.studyLogs.filter((l) => l.date === key);
    result.push({
      date: key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      count: logs.reduce((s, l) => s + l.count, 0),
      correct: logs.reduce((s, l) => s + (l.correct ?? 0), 0),
      wrong: logs.reduce((s, l) => s + (l.wrong ?? 0), 0),
    });
  }
  return result;
}

export type SubjectStat = {
  subjectId: string;
  count: number;
  correct: number;
  wrong: number;
  accuracy: number | null;
};

/** 과목별 누적 학습량·정답률 */
export function getSubjectStats(data: AppData): SubjectStat[] {
  const map = new Map<string, SubjectStat>();
  for (const log of data.studyLogs) {
    const cur =
      map.get(log.subjectId) ??
      { subjectId: log.subjectId, count: 0, correct: 0, wrong: 0, accuracy: null };
    cur.count += log.count;
    cur.correct += log.correct ?? 0;
    cur.wrong += log.wrong ?? 0;
    map.set(log.subjectId, cur);
  }
  return Array.from(map.values())
    .map((s) => {
      const graded = s.correct + s.wrong;
      return { ...s, accuracy: graded > 0 ? Math.round((s.correct / graded) * 100) : null };
    })
    .sort((a, b) => b.count - a.count);
}

/** 집중 시간 합계 (분) */
export function getFocusMinutes(data: AppData, days = 7): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return data.focusSessions
    .filter((s) => new Date(s.startedAt) >= cutoff)
    .reduce((sum, s) => sum + s.minutes, 0);
}

/** 오늘까지의 총 학습 카드 수 */
export function getTotalStudied(data: AppData): number {
  return data.studyLogs.reduce((s, l) => s + l.count, 0);
}

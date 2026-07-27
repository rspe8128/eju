/**
 * 기출 응시 기록(ExamAttempt)을 단원별 정답률로 집계해 약점을 뽑아낸다.
 */

import type { ExamAttempt } from "./types";
import { getTopicLabel, UNTAGGED } from "./examTopics";

export type TopicStat = {
  topicId: string;
  label: string;
  subjectCode: string;
  attempted: number;
  correct: number;
  accuracy: number;
  /** 최근 응시 3회 기준 정답률 (추세 비교용) */
  recentAccuracy: number | null;
};

export type SubjectStat = {
  subjectCode: string;
  attempted: number;
  correct: number;
  accuracy: number;
  attempts: number;
  /** 평균 소요 시간(분) */
  avgMinutes: number;
};

/** 표본이 이보다 적으면 "약점"으로 단정하지 않는다. */
export const MIN_SAMPLE = 4;

function accuracy(correct: number, total: number): number {
  return total === 0 ? 0 : correct / total;
}

export function subjectStats(attempts: ExamAttempt[]): SubjectStat[] {
  const map = new Map<string, SubjectStat>();
  for (const a of attempts) {
    const cur = map.get(a.subjectCode) ?? {
      subjectCode: a.subjectCode,
      attempted: 0,
      correct: 0,
      accuracy: 0,
      attempts: 0,
      avgMinutes: 0,
    };
    cur.attempted += a.totalCount;
    cur.correct += a.correctCount;
    cur.attempts += 1;
    cur.avgMinutes += a.minutes;
    map.set(a.subjectCode, cur);
  }
  return [...map.values()]
    .map((s) => ({
      ...s,
      accuracy: accuracy(s.correct, s.attempted),
      avgMinutes: s.attempts === 0 ? 0 : Math.round(s.avgMinutes / s.attempts),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function topicStats(attempts: ExamAttempt[], subjectCode?: string): TopicStat[] {
  const filtered = subjectCode
    ? attempts.filter((a) => a.subjectCode === subjectCode)
    : attempts;

  // 최근 3회 응시분을 따로 표시하기 위해 날짜 역순 정렬
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const recentIds = new Set(sorted.slice(0, 3).map((a) => a.id));

  const map = new Map<
    string,
    { subjectCode: string; attempted: number; correct: number; rA: number; rC: number }
  >();

  for (const a of filtered) {
    for (const r of a.results) {
      const key = `${a.subjectCode}::${r.topicId}`;
      const cur = map.get(key) ?? {
        subjectCode: a.subjectCode,
        attempted: 0,
        correct: 0,
        rA: 0,
        rC: 0,
      };
      cur.attempted += 1;
      if (r.correct) cur.correct += 1;
      if (recentIds.has(a.id)) {
        cur.rA += 1;
        if (r.correct) cur.rC += 1;
      }
      map.set(key, cur);
    }
  }

  return [...map.entries()]
    .map(([key, v]) => {
      const topicId = key.split("::")[1];
      return {
        topicId,
        subjectCode: v.subjectCode,
        label: getTopicLabel(v.subjectCode, topicId),
        attempted: v.attempted,
        correct: v.correct,
        accuracy: accuracy(v.correct, v.attempted),
        recentAccuracy: v.rA >= MIN_SAMPLE ? accuracy(v.rC, v.rA) : null,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);
}

/** 표본이 충분하면서 정답률이 낮은 순 — 실제로 파고들 단원 */
export function weakTopics(attempts: ExamAttempt[], limit = 8): TopicStat[] {
  return topicStats(attempts)
    .filter((t) => t.topicId !== UNTAGGED && t.attempted >= MIN_SAMPLE)
    .slice(0, limit);
}

/** 아직 태그가 안 붙어서 분석에 못 들어간 문항 수 */
export function untaggedCount(attempts: ExamAttempt[]): number {
  return attempts.reduce(
    (sum, a) => sum + a.results.filter((r) => r.topicId === UNTAGGED).length,
    0
  );
}

/** 회차별 점수 추이 (같은 과목 안에서) */
export function accuracyTrend(attempts: ExamAttempt[], subjectCode: string) {
  return attempts
    .filter((a) => a.subjectCode === subjectCode)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({
      label: a.paperId,
      date: a.date,
      accuracy: Math.round(accuracy(a.correctCount, a.totalCount) * 100),
      minutes: a.minutes,
    }));
}

/** 오답이 가장 많이 몰린 문항 번호 (배치 문제 파악용) */
export function hardQuestions(attempts: ExamAttempt[], paperId: string, subjectCode: string) {
  const target = attempts.filter(
    (a) => a.paperId === paperId && a.subjectCode === subjectCode
  );
  const map = new Map<number, { wrong: number; total: number }>();
  for (const a of target) {
    for (const r of a.results) {
      const cur = map.get(r.q) ?? { wrong: 0, total: 0 };
      cur.total += 1;
      if (!r.correct) cur.wrong += 1;
      map.set(r.q, cur);
    }
  }
  return [...map.entries()]
    .map(([q, v]) => ({ q, ...v }))
    .filter((v) => v.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong);
}

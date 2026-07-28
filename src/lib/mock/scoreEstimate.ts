import type { ExamAttempt, ExamRecord } from "../types";
import { getMaxScore } from "../eju";

/**
 * 모의고사 섹션 정답률 → EJU 환산 점수(추정).
 * - 일본어 독해/청해/청독해: 정답률 × 200 (각 영역 만점 200)
 * - 그 외 과목: 정답률 × 해당 과목 만점(보통 200 또는 100)
 * 기술(작문)은 객관식이 아니라 여기 안 넣는다.
 */
export function estimateSectionScore(
  subjectCode: string,
  sectionId: string,
  correct: number,
  total: number
): { scoreKey: string; score: number; max: number } | null {
  if (total <= 0) return null;
  const rate = correct / total;

  if (subjectCode === "japanese") {
    if (sectionId === "writing") return null;
    // reading / listening / listening-chart → 각 200점 환산
    return { scoreKey: "japanese", score: Math.round(rate * 200), max: 200 };
  }

  const max = getMaxScore(subjectCode);
  return { scoreKey: subjectCode, score: Math.round(rate * max), max };
}

/** attempt.paperId 는 `${paper.id}:${section.id}` 형태 */
export function splitAttemptKey(paperId: string): { paperId: string; sectionId: string } | null {
  const i = paperId.lastIndexOf(":");
  if (i <= 0) return null;
  return { paperId: paperId.slice(0, i), sectionId: paperId.slice(i + 1) };
}

/**
 * 같은 회차(mockPaperId)의 최신 섹션 시도만 모아 과목별 환산 점수를 만든다.
 * 일본어는 섹션별 200점 환산을 합산하되 400을 넘지 않게 자른다.
 */
export function buildAutoMockRecords(attempts: ExamAttempt[]): ExamRecord[] {
  // paperBase → date → sectionId → latest attempt
  type Cell = ExamAttempt;
  const byPaper = new Map<string, Map<string, Map<string, Cell>>>();

  const sorted = [...attempts].sort((a, b) => a.date.localeCompare(b.date));
  for (const a of sorted) {
    const split = splitAttemptKey(a.paperId);
    if (!split) continue;
    if (split.sectionId === "writing") continue;

    let byDate = byPaper.get(split.paperId);
    if (!byDate) {
      byDate = new Map();
      byPaper.set(split.paperId, byDate);
    }
    let bySection = byDate.get(a.date);
    if (!bySection) {
      bySection = new Map();
      byDate.set(a.date, bySection);
    }
    // 같은 날 같은 섹션은 나중에 푼 것으로 덮어씀 (배열 순서가 시간순에 가깝다)
    bySection.set(split.sectionId, a);
  }

  const out: ExamRecord[] = [];
  for (const [mockPaperId, byDate] of byPaper) {
    // 회차당 가장 최근 날짜만 추이에 쓴다
    const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
    const latestDate = dates[0];
    if (!latestDate) continue;
    const sections = byDate.get(latestDate)!;

    const scores: Record<string, number> = {};
    const memos: string[] = [];
    let japaneseSum = 0;

    for (const [sectionId, attempt] of sections) {
      const est = estimateSectionScore(
        attempt.subjectCode,
        sectionId,
        attempt.correctCount,
        attempt.totalCount
      );
      if (!est) continue;
      memos.push(attempt.memo ?? `${sectionId} ${attempt.correctCount}/${attempt.totalCount}`);
      if (est.scoreKey === "japanese") {
        japaneseSum += est.score;
      } else {
        scores[est.scoreKey] = est.score;
      }
    }
    if (japaneseSum > 0) scores.japanese = Math.min(400, japaneseSum);

    if (Object.keys(scores).length === 0) continue;

    out.push({
      id: `auto-${mockPaperId}-${latestDate}`,
      date: latestDate,
      kind: "mock",
      scores,
      memo: `[모의 자동·추정] ${memos.join(" · ")}`,
      source: "mock-auto",
      mockPaperId,
    });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** 수동 기록 + 자동 환산(회차별 최신)을 합친 추이용 목록 */
export function mergeScoreSeries(
  manual: ExamRecord[],
  attempts: ExamAttempt[]
): ExamRecord[] {
  const auto = buildAutoMockRecords(attempts);
  const combined = [
    ...manual.map((r) => ({ ...r, source: r.source ?? ("manual" as const) })),
    ...auto,
  ];
  return combined.sort((a, b) => a.date.localeCompare(b.date));
}

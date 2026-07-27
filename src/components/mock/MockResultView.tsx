"use client";

import { useMemo } from "react";
import { RotateCcw, ListChecks, ChevronLeft, TrendingUp } from "lucide-react";
import type { MockPaper, MockSection } from "@/lib/mock/types";
import type { AttemptResult } from "@/lib/types";
import { getTopicLabel } from "@/lib/examTopics";
import { cn } from "@/lib/utils";

/**
 * 채점 결과.
 * 점수만 보여주면 다음 행동이 안 나오므로, 단원별 정답률과 틀린 문항 목록을 같이 낸다.
 */
export function MockResultView({
  paper,
  section,
  results,
  correctCount,
  onReview,
  onRetry,
  onExit,
}: {
  paper: MockPaper;
  section: MockSection;
  results: AttemptResult[];
  correctCount: number;
  onReview: () => void;
  onRetry: () => void;
  onExit: () => void;
}) {
  const total = results.length;
  const accuracy = total === 0 ? 0 : correctCount / total;
  const unanswered = results.filter((r) => !r.picked).length;

  /** EJU 일본어 독해는 200점 만점이다. 문항당 배점이 공개돼 있지 않으므로 어디까지나 참고값. */
  const scaled =
    paper.subjectCode === "japanese" && section.kind === "reading"
      ? Math.round(accuracy * 200)
      : null;

  const byTopic = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    for (const r of results) {
      const cur = map.get(r.topicId) ?? { correct: 0, total: 0 };
      cur.total += 1;
      if (r.correct) cur.correct += 1;
      map.set(r.topicId, cur);
    }
    return [...map.entries()]
      .map(([topicId, v]) => ({
        topicId,
        label: getTopicLabel(paper.subjectCode, topicId),
        ...v,
        rate: v.correct / v.total,
      }))
      .sort((a, b) => a.rate - b.rate);
  }, [results, paper.subjectCode]);

  const wrong = results.filter((r) => !r.correct);

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <button
        onClick={onExit}
        className="mb-4 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        목록으로
      </button>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-800">
        <p className="text-sm text-zinc-500">
          {paper.title} · {section.label}
        </p>
        <p className="mt-3 text-5xl font-bold tabular-nums">
          {correctCount}
          <span className="text-2xl font-medium text-zinc-400"> / {total}</span>
        </p>
        <p
          className={cn(
            "mt-2 text-lg font-semibold",
            accuracy >= 0.8
              ? "text-green-600"
              : accuracy >= 0.6
                ? "text-blue-600"
                : "text-amber-600"
          )}
        >
          정답률 {Math.round(accuracy * 100)}%
        </p>
        {scaled !== null && (
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-zinc-500">
            <TrendingUp className="h-3.5 w-3.5" />
            EJU 독해 환산 약 {scaled}점 / 200점 (참고값)
          </p>
        )}
        {unanswered > 0 && (
          <p className="mt-2 text-xs text-red-500">무응답 {unanswered}문항</p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onReview}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <ListChecks className="h-4 w-4" />
            문항별 해설 보기
          </button>
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium dark:border-zinc-700"
          >
            <RotateCcw className="h-4 w-4" />
            다시 풀기
          </button>
        </div>
      </div>

      {/* 단원별 */}
      <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <h3 className="text-sm font-semibold">출제 영역별 정답률</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          낮은 순으로 정렬. 이 기록은 약점 분석 페이지에도 그대로 쌓인다.
        </p>
        <ul className="mt-4 space-y-2.5">
          {byTopic.map((t) => (
            <li key={t.topicId}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-300">{t.label}</span>
                <span className="tabular-nums text-zinc-500">
                  {t.correct}/{t.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                <div
                  className={cn(
                    "h-full rounded-full",
                    t.rate >= 0.8 ? "bg-green-500" : t.rate >= 0.5 ? "bg-blue-500" : "bg-red-500"
                  )}
                  style={{ width: `${t.rate * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 오답 */}
      {wrong.length > 0 && (
        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="text-sm font-semibold">틀린 문항 {wrong.length}개</h3>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {wrong.map((r) => (
              <li
                key={r.q}
                className="rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:bg-red-900/25 dark:text-red-300"
              >
                {r.q}번 · {r.picked || "무응답"} → {r.answer}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            채점 직후가 가장 잘 붙는다. 지금 바로 해설을 읽고, 왜 그 오답에 끌렸는지를 한 줄로
            적어 두자. 같은 함정에 두 번 걸리지 않는다.
          </p>
        </section>
      )}
    </div>
  );
}

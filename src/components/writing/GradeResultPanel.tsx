"use client";

import { Sparkles, ThumbsUp, AlertTriangle, PenLine, Info } from "lucide-react";
import type { GradeResult } from "@/app/api/grade-writing/route";
import { cn } from "@/lib/utils";

/** EJU 記述 평균이 50점 만점에 30점 안팎이라, 그 근처를 기준으로 색을 나눈다. */
function scoreColor(ratio: number): string {
  if (ratio >= 0.8) return "text-green-600";
  if (ratio >= 0.6) return "text-blue-600";
  if (ratio >= 0.4) return "text-amber-600";
  return "text-red-500";
}

function barColor(ratio: number): string {
  if (ratio >= 0.8) return "bg-green-500";
  if (ratio >= 0.6) return "bg-blue-500";
  if (ratio >= 0.4) return "bg-amber-500";
  return "bg-red-500";
}

export function GradeResultPanel({ result }: { result: GradeResult }) {
  const ratio = result.max ? result.total / result.max : 0;

  return (
    <section className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-5 dark:border-violet-900/60 dark:bg-violet-900/10">
      <header className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-violet-500" />
          AI 채점 결과
        </h3>
        <span className="text-[11px] text-zinc-400">{result.model}</span>
      </header>

      <div className="text-center">
        <p className={cn("text-4xl font-bold tabular-nums", scoreColor(ratio))}>
          {result.total}
          <span className="text-xl font-medium text-zinc-400"> / {result.max}</span>
        </p>
      </div>

      <ul className="space-y-3">
        {result.axes.map((a) => {
          const r = a.max ? a.score / a.max : 0;
          return (
            <li key={a.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{a.label}</span>
                <span className="tabular-nums text-zinc-500">
                  {a.score} / {a.max}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div className={cn("h-full rounded-full", barColor(r))} style={{ width: `${r * 100}%` }} />
              </div>
              {a.comment && (
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {a.comment}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {result.strengths.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
            <ThumbsUp className="h-3.5 w-3.5" />
            잘한 점
          </p>
          <ul className="space-y-1">
            {result.strengths.map((s, i) => (
              <li key={i} className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                · {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.improvements.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            고칠 점
          </p>
          <ul className="space-y-1">
            {result.improvements.map((s, i) => (
              <li key={i} className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                · {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.fixes.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <PenLine className="h-3.5 w-3.5" />
            문장 첨삭 {result.fixes.length}건
          </p>
          <ul className="space-y-2">
            {result.fixes.map((f, i) => (
              <li
                key={i}
                className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <p className="ja-ui text-[13px] text-red-600 line-through decoration-red-300 dark:text-red-400">
                  {f.original}
                </p>
                <p className="ja-ui mt-1 text-[13px] text-green-700 dark:text-green-400">
                  {f.corrected}
                </p>
                {f.reason && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{f.reason}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.advice && (
        <p className="rounded-xl bg-white p-3 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {result.advice}
        </p>
      )}

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-400">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        JASSO는 공식 채점표를 공개하지 않는다. 이 점수는 공개된 채점 관점(과제 대응·구성·언어)을
        토대로 만든 연습용 기준이며, 실제 점수와는 다를 수 있다. 점수보다 첨삭 내용을 보자.
      </p>
    </section>
  );
}

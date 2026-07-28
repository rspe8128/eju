"use client";

import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { analyzeWriting, type WritingCheck } from "@/lib/writing/analyze";
import { cn } from "@/lib/utils";

/**
 * 규칙 기반 자동 점검 패널.
 * /writing 과 모의고사 기술 세션이 같은 기준을 보게 하려고 공통 컴포넌트로 뺐다.
 */

const CHECK_ICON = { ok: CheckCircle2, warn: AlertTriangle, fail: XCircle } as const;
const CHECK_STYLE = {
  ok: "text-green-600 dark:text-green-400",
  warn: "text-amber-600 dark:text-amber-400",
  fail: "text-red-500",
} as const;

export function CheckRow({ check }: { check: WritingCheck }) {
  const Icon = CHECK_ICON[check.level];
  return (
    <li className="flex items-start gap-2">
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", CHECK_STYLE[check.level])} />
      <div className="min-w-0 flex-1">
        <p className="text-xs">
          <span className="font-medium">{check.label}</span>
          <span className="ml-1.5 text-zinc-500">{check.detail}</span>
        </p>
        {check.samples && check.samples.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {check.samples.map((s, i) => (
              <li key={i} className="ja-ui truncate text-[11px] text-zinc-400">
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/** analyzeWriting 결과를 재계산하지 않고 나눠 쓰기 위한 훅 */
export function useWritingAnalysis(body: string) {
  return useMemo(() => analyzeWriting(body), [body]);
}

export function WritingChecks({
  checks,
  className,
}: {
  checks: WritingCheck[];
  className?: string;
}) {
  if (checks.length === 0) return null;
  return (
    <section
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800",
        className
      )}
    >
      <h3 className="mb-3 text-sm font-semibold">자동 점검</h3>
      <ul className="space-y-2.5">
        {checks.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
        여기 나오는 건 AI 없이 규칙으로 확실히 잡히는 것들이다. 이걸 먼저 정리하고 AI 채점을 받으면
        내용에 대한 지적을 더 많이 받을 수 있다.
      </p>
    </section>
  );
}

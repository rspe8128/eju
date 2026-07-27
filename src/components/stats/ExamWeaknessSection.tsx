"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, TriangleAlert, ArrowRight } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { subjectStats, topicStats, untaggedCount, MIN_SAMPLE } from "@/lib/weakness";
import { getSubjectLabel } from "@/lib/eju";
import { cn } from "@/lib/utils";

function barColor(acc: number): string {
  if (acc >= 0.8) return "bg-green-500";
  if (acc >= 0.6) return "bg-amber-500";
  return "bg-red-500";
}

/** 기출 응시 기록 기반 단원별 약점. 시험 탭에서 채점한 결과가 여기로 흘러온다. */
export function ExamWeaknessSection() {
  const { data } = useStorage();
  const attempts = data.examAttempts;
  const [subject, setSubject] = useState<string | null>(null);

  const bySubject = useMemo(() => subjectStats(attempts), [attempts]);
  const topics = useMemo(
    () => topicStats(attempts, subject ?? undefined).filter((t) => t.attempted >= 1),
    [attempts, subject]
  );
  const untagged = useMemo(() => untaggedCount(attempts), [attempts]);

  if (attempts.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
        <FileText className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-3 text-sm font-medium">아직 기출 응시 기록이 없다</p>
        <p className="mt-1 text-xs text-zinc-500">
          기출을 풀고 채점하면 단원별 정답률이 여기에 쌓인다.
        </p>
        <Link
          href="/exam"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          기출 풀러 가기
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">기출 단원별 약점</h2>
        <Link href="/exam" className="text-xs text-blue-600 hover:underline">
          기출 풀기 →
        </Link>
      </div>

      {/* 과목별 요약 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {bySubject.map((s) => (
          <button
            key={s.subjectCode}
            onClick={() => setSubject(subject === s.subjectCode ? null : s.subjectCode)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-colors",
              subject === s.subjectCode
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                : "border-zinc-200 hover:border-blue-300 dark:border-zinc-700"
            )}
          >
            <p className="text-xs text-zinc-500">{getSubjectLabel(s.subjectCode)}</p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold",
                s.accuracy >= 0.8
                  ? "text-green-600"
                  : s.accuracy >= 0.6
                    ? "text-amber-500"
                    : "text-red-500"
              )}
            >
              {Math.round(s.accuracy * 100)}%
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">
              {s.attempts}회 응시 · {s.correct}/{s.attempted}문항 · 평균 {s.avgMinutes}분
            </p>
          </button>
        ))}
      </div>

      {untagged > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          단원 태그가 없는 문항이 {untagged}개 있다. 시험 탭 → 정답표 수정에서 태그를 붙이면 아래
          분석이 정확해진다.
        </p>
      )}

      {/* 단원별 정답률 */}
      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            단원별 정답률
            {subject && (
              <span className="ml-2 text-xs font-normal text-zinc-500">
                {getSubjectLabel(subject)}
              </span>
            )}
          </h3>
          {subject && (
            <button
              onClick={() => setSubject(null)}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              전체 보기
            </button>
          )}
        </div>

        {topics.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            집계할 데이터가 없다. 문항에 단원 태그를 붙여보자.
          </p>
        ) : (
          <div className="space-y-2.5">
            {topics.map((t) => {
              const pct = Math.round(t.accuracy * 100);
              const thin = t.attempted < MIN_SAMPLE;
              return (
                <div key={`${t.subjectCode}-${t.topicId}`} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 truncate text-xs sm:w-52">
                    <span className={cn(thin && "text-zinc-400")}>{t.label}</span>
                    {!subject && (
                      <span className="ml-1 text-[10px] text-zinc-400">
                        ({getSubjectLabel(t.subjectCode)})
                      </span>
                    )}
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={cn("h-full rounded-full", thin ? "bg-zinc-300" : barColor(t.accuracy))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums">
                    <span className={cn("font-medium", thin && "text-zinc-400")}>{pct}%</span>
                    <span className="ml-1 text-zinc-400">
                      {t.correct}/{t.attempted}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
          회색 막대는 표본이 {MIN_SAMPLE}문항 미만이라 아직 약점이라 단정할 수 없는 단원이다. 같은
          단원을 몇 문항 더 풀어야 판단이 선다.
        </p>
      </div>
    </section>
  );
}

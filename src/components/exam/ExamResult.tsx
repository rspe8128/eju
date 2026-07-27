"use client";

import { useMemo, useState } from "react";
import { Check, X, Save, RotateCcw } from "lucide-react";
import type { AnswerKey, AttemptResult, ExamAttempt } from "@/lib/types";
import { getTopics, UNTAGGED } from "@/lib/examTopics";
import { getSubjectLabel } from "@/lib/eju";
import type { PastPaper } from "@/lib/data/ejuPastPapers";
import { cn, todayString } from "@/lib/utils";

export function ExamResult({
  paper,
  subjectCode,
  answerKey,
  responses,
  minutes,
  onSave,
  onRetry,
  onExit,
}: {
  paper: PastPaper;
  subjectCode: string;
  answerKey: AnswerKey;
  responses: string[];
  minutes: number;
  onSave: (attempt: Omit<ExamAttempt, "id">, updatedKey: AnswerKey) => void;
  onRetry: () => void;
  onExit: () => void;
}) {
  const topics = getTopics(subjectCode);
  const [topicIds, setTopicIds] = useState<string[]>(() =>
    answerKey.answers.map((_, i) => answerKey.topics[i] ?? UNTAGGED)
  );
  const [onlyWrong, setOnlyWrong] = useState(true);

  const results = useMemo<AttemptResult[]>(
    () =>
      answerKey.answers.map((answer, i) => {
        const picked = responses[i] ?? "";
        return {
          q: i + 1,
          picked,
          answer,
          correct: answer !== "" && picked === answer,
          topicId: topicIds[i] ?? UNTAGGED,
        };
      }),
    [answerKey.answers, responses, topicIds]
  );

  const gradable = results.filter((r) => r.answer !== "");
  const correctCount = gradable.filter((r) => r.correct).length;
  const total = gradable.length;
  const pct = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  const blank = results.filter((r) => r.picked === "").length;
  const untagged = results.filter((r) => !r.correct && r.topicId === UNTAGGED).length;

  const visible = onlyWrong ? results.filter((r) => !r.correct) : results;

  const save = () => {
    onSave(
      {
        paperId: paper.id,
        subjectCode,
        date: todayString(),
        responses,
        correctCount,
        totalCount: total,
        minutes,
        results,
      },
      { ...answerKey, topics: topicIds, updatedAt: new Date().toISOString() }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">채점 결과</h2>
        <p className="text-sm text-zinc-500">
          {paper.label} · {getSubjectLabel(subjectCode)} · {minutes}분 소요
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">정답률</p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold",
              pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-500" : "text-red-500"
            )}
          >
            {pct}%
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">맞은 문항</p>
          <p className="mt-1 text-3xl font-bold">
            {correctCount}
            <span className="text-base font-normal text-zinc-400"> / {total}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">무응답</p>
          <p className="mt-1 text-3xl font-bold text-zinc-400">{blank}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">소요 시간</p>
          <p className="mt-1 text-3xl font-bold">
            {minutes}
            <span className="text-base font-normal text-zinc-400">분</span>
          </p>
        </div>
      </div>

      {untagged > 0 && (
        <div className="rounded-xl bg-blue-50 p-4 text-sm dark:bg-blue-900/20">
          <p className="font-medium text-blue-900 dark:text-blue-200">
            태그가 없는 오답이 {untagged}문항 있다.
          </p>
          <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
            단원을 지정해야 약점 분석에 잡힌다. 아래에서 오답만 골라 붙이면 된다 — 한 번 붙여두면
            이 회차는 다음부터 자동으로 분류된다.
          </p>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">문항별 결과</h3>
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={onlyWrong}
              onChange={(e) => setOnlyWrong(e.target.checked)}
              className="rounded"
            />
            오답만 보기
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
            오답 없음. 완벽하다.
          </p>
        ) : (
          <div className="space-y-2">
            {visible.map((r) => (
              <div
                key={r.q}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-xl border p-3",
                  r.correct
                    ? "border-zinc-200 dark:border-zinc-700"
                    : "border-red-200 bg-red-50/40 dark:border-red-900/50 dark:bg-red-900/10"
                )}
              >
                <span className="w-8 shrink-0 text-sm font-medium text-zinc-500">{r.q}</span>
                {r.correct ? (
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-red-500" />
                )}
                <span className="text-sm">
                  <span className="text-zinc-400">내 답</span>{" "}
                  <span className="font-mono font-medium">{r.picked || "–"}</span>
                  <span className="mx-2 text-zinc-300">/</span>
                  <span className="text-zinc-400">정답</span>{" "}
                  <span className="font-mono font-medium text-green-600">{r.answer}</span>
                </span>
                <select
                  value={r.topicId}
                  onChange={(e) =>
                    setTopicIds((prev) => {
                      const next = [...prev];
                      next[r.q - 1] = e.target.value;
                      return next;
                    })
                  }
                  className="ml-auto min-w-0 max-w-[14rem] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                >
                  <option value={UNTAGGED}>단원 미분류</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={save}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Save className="h-4 w-4" />
          기록 저장하고 약점에 반영
        </button>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 px-5 py-2.5 text-sm dark:border-zinc-700"
        >
          <RotateCcw className="h-4 w-4" />
          다시 풀기
        </button>
        <button
          onClick={onExit}
          className="rounded-xl px-5 py-2.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          목록으로
        </button>
      </div>
    </div>
  );
}

"use client";

import { Check, X, Lightbulb } from "lucide-react";
import type { MockQuestion } from "@/lib/mock/types";
import { questionTexts } from "@/lib/mock/types";
import { useTranslate } from "@/lib/mock/useTranslate";
import { getTopicLabel } from "@/lib/examTopics";
import { TranslateButton, TranslateError } from "./TranslateButton";
import { cn } from "@/lib/utils";

/**
 * 문항 한 개.
 * - 풀이 모드(review=false): 선택지를 누르면 답이 기록된다. 정답은 보이지 않는다.
 * - 복습 모드(review=true): 정답·오답 표시와 해설이 함께 나온다.
 *
 * 발문과 선택지의 번역은 한 번의 DeepL 호출로 같이 가져온다(호출 수·한도 절약).
 */
export function QuestionView({
  question,
  subjectCode,
  picked,
  onPick,
  review = false,
}: {
  question: MockQuestion;
  subjectCode: string;
  picked: string | undefined;
  onPick?: (key: string) => void;
  review?: boolean;
}) {
  const tr = useTranslate(questionTexts(question));
  const koStem = tr.shown ? tr.lines[0] : null;
  const koChoices = tr.shown ? tr.lines.slice(1) : null;

  const isCorrect = picked === question.answer;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-bold",
              review
                ? isCorrect
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            )}
          >
            {question.number}
          </span>
          <span className="text-[11px] text-zinc-400">
            {getTopicLabel(subjectCode, question.topicId)}
          </span>
        </div>
        <TranslateButton
          shown={tr.shown}
          loading={tr.loading}
          cached={tr.cached}
          onClick={tr.toggle}
          label="문제 번역"
        />
      </header>

      <div className="px-4 py-4">
        <p className="ja-ui text-[15px] font-medium">{question.stemJa}</p>
        {koStem && (
          <p className="mt-1.5 rounded-lg bg-blue-50/70 px-3 py-1.5 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            {koStem}
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {question.choices.map((c, i) => {
            const selected = picked === c.key;
            const isAnswer = question.answer === c.key;
            const showAsAnswer = review && isAnswer;
            const showAsWrong = review && selected && !isAnswer;

            return (
              <li key={c.key}>
                <button
                  type="button"
                  disabled={review}
                  onClick={() => onPick?.(c.key)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    showAsAnswer
                      ? "border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                      : showAsWrong
                        ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                        : selected
                          ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/25"
                          : "border-zinc-200 hover:border-blue-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-blue-600 dark:hover:bg-zinc-700/40",
                    review && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                      showAsAnswer
                        ? "border-green-500 bg-green-500 text-white"
                        : showAsWrong
                          ? "border-red-500 bg-red-500 text-white"
                          : selected
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-zinc-300 text-zinc-500 dark:border-zinc-600"
                    )}
                  >
                    {showAsAnswer ? (
                      <Check className="h-3 w-3" />
                    ) : showAsWrong ? (
                      <X className="h-3 w-3" />
                    ) : (
                      c.key
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="ja-ui block text-[15px]">{c.ja}</span>
                    {koChoices && koChoices[i] && (
                      <span className="mt-0.5 block text-[13px] text-blue-700 dark:text-blue-300">
                        {koChoices[i]}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {tr.error && <TranslateError message={tr.error} />}

        {review && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/50 dark:bg-amber-900/15">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Lightbulb className="h-3.5 w-3.5" />
              해설 · 정답 {question.answer}번
              {picked && !isCorrect && (
                <span className="font-normal text-amber-700/80 dark:text-amber-400/80">
                  （고른 답 {picked}번）
                </span>
              )}
              {!picked && (
                <span className="font-normal text-amber-700/80 dark:text-amber-400/80">
                  （무응답）
                </span>
              )}
            </p>
            <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100/90">
              {question.explanationKo}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

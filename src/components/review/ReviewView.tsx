"use client";

import { useState } from "react";
import { Check, X, HelpCircle } from "lucide-react";
import { useStorage, useUnresolvedMistakes } from "@/context/StorageContext";
import { FlashcardSession } from "@/components/study/FlashcardSession";
import { QuizSession } from "@/components/study/QuizSession";

export function ReviewView() {
  const { data, updateCard, resolveMistake, markProblemSolved } = useStorage();
  const mistakes = useUnresolvedMistakes();
  const [mode, setMode] = useState<"list" | "flash" | "quiz">("list");

  const mistakeCards = mistakes
    .filter((m) => m.sourceType === "card")
    .map((m) => data.cards.find((c) => c.id === m.sourceId))
    .filter(Boolean) as typeof data.cards;

  if (mode === "flash" && mistakeCards.length > 0) {
    return (
      <div>
        <button onClick={() => setMode("list")} className="mb-4 text-sm text-zinc-500">
          ← 돌아가기
        </button>
        <h2 className="mb-4 text-lg font-semibold">오답 복습</h2>
        <FlashcardSession
          cards={mistakeCards}
          onRate={(id, rating) => {
            updateCard(id, rating);
            if (rating >= 3) resolveMistake("card", id);
          }}
          onComplete={() => setMode("list")}
        />
      </div>
    );
  }

  if (mode === "quiz" && mistakeCards.length > 0) {
    return (
      <div>
        <button onClick={() => setMode("list")} className="mb-4 text-sm text-zinc-500">
          ← 돌아가기
        </button>
        <h2 className="mb-4 text-lg font-semibold">오답 퀴즈 재도전</h2>
        <QuizSession
          cards={mistakeCards}
          poolCards={data.cards}
          onComplete={() => setMode("list")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">오답노트</h1>
          <p className="text-sm text-zinc-500">전 과목 통합 · {mistakes.length}개 미해결</p>
        </div>
        {mistakeCards.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setMode("flash")}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              카드 복습
            </button>
            <button
              onClick={() => setMode("quiz")}
              className="flex items-center gap-1 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 dark:border-red-900"
            >
              <HelpCircle className="h-4 w-4" />
              퀴즈 재도전
            </button>
          </div>
        )}
      </div>

      {mistakes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="mb-2 text-zinc-500">오답이 없습니다. 잘하고 있어요!</p>
          <a href="/study/japanese" className="text-sm text-blue-600 hover:underline">
            학습하러 가기
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {mistakes.map((m) => {
            if (m.sourceType === "card") {
              const card = data.cards.find((c) => c.id === m.sourceId);
              if (!card) return null;
              const deck = data.decks.find((d) => d.id === card.deckId);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div>
                    <p className="font-medium">{card.front}</p>
                    <p className="text-sm text-zinc-500">{card.back}</p>
                    <p className="mt-1 text-xs text-zinc-400">{deck?.title}</p>
                  </div>
                  <button
                    onClick={() => resolveMistake("card", card.id)}
                    className="rounded-lg p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    title="해결됨"
                    aria-label="해결됨"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>
              );
            }

            const item = data.items.find((i) => i.id === m.sourceId);
            if (!item || item.type !== "problem") return null;
            const unit = data.units.find((u) => u.id === item.unitId);
            const subject = data.subjects.find((s) => s.id === unit?.subjectId);

            return (
              <ProblemMistakeCard
                key={m.id}
                item={item}
                subjectName={subject?.name ?? ""}
                onCorrect={() => {
                  markProblemSolved(item.id, true);
                  resolveMistake("problem", item.id);
                }}
                onDismiss={() => resolveMistake("problem", item.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProblemMistakeCard({
  item,
  subjectName,
  onCorrect,
  onDismiss,
}: {
  item: {
    id: string;
    title: string;
    question: string;
    answer: string;
    explanation?: string;
  };
  subjectName: string;
  onCorrect: () => void;
  onDismiss: () => void;
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-zinc-400">{subjectName} · 문제</span>
        <div className="flex gap-1">
          <button
            onClick={onCorrect}
            className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            title="맞음"
            aria-label="맞음"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="해제"
            aria-label="해제"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="font-medium">{item.title}</p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.question}</p>
      {showAnswer ? (
        <div className="mt-2 text-sm">
          <p className="font-medium text-blue-600 dark:text-blue-400">정답: {item.answer}</p>
          {item.explanation && (
            <p className="mt-1 text-zinc-500">해설: {item.explanation}</p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowAnswer(true)}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          정답 보기
        </button>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Play, HelpCircle, Sparkles } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { FlashcardSession } from "./FlashcardSession";
import { QuizSession } from "./QuizSession";
import { getDueCards } from "@/lib/srs";
import { shuffle } from "@/lib/utils";
import { computePlan } from "@/lib/plan";

type Mode = "select" | "flashcard" | "quiz";

export function TodaySessionView() {
  const { data, updateCard } = useStorage();
  const [mode, setMode] = useState<Mode>("select");

  const plans = useMemo(() => computePlan(data), [data]);
  const quotaByDeck = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of plans) {
      if (p.kind === "deck") map.set(p.refId, p.dailyQuota);
    }
    return map;
  }, [plans]);

  /** 오늘 복습 대상 + 플랜 할당량만큼의 신규 카드 (전 덱 통합) */
  const sessionCards = useMemo(() => {
    const due = getDueCards(data.cards).filter((c) => (c.srs.reviews ?? 0) > 0);

    const newCards = data.decks.flatMap((deck) => {
      const quota = quotaByDeck.get(deck.id) ?? 0;
      if (quota <= 0) return [];
      const fresh = data.cards.filter(
        (c) => c.deckId === deck.id && (c.srs.reviews ?? 0) === 0
      );
      return fresh.slice(0, quota);
    });

    return shuffle([...due, ...newCards]);
  }, [data.cards, data.decks, quotaByDeck]);

  const dueCount = getDueCards(data.cards).filter((c) => (c.srs.reviews ?? 0) > 0).length;
  const newCount = sessionCards.length - dueCount;

  if (mode !== "select" && sessionCards.length > 0) {
    return (
      <div>
        <button onClick={() => setMode("select")} className="mb-4 text-sm text-zinc-500">
          ← 돌아가기
        </button>
        {mode === "flashcard" ? (
          <FlashcardSession
            cards={sessionCards}
            onRate={updateCard}
            onComplete={() => setMode("select")}
          />
        ) : (
          <QuizSession
            cards={sessionCards}
            poolCards={data.cards}
            onComplete={() => setMode("select")}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">오늘의 학습</h1>
        <p className="mt-1 text-sm text-zinc-500">
          모든 덱에서 오늘 봐야 할 카드만 모았다. 덱을 하나하나 돌 필요 없다.
        </p>
      </header>

      {sessionCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <Sparkles className="mx-auto h-10 w-10 text-green-500" />
          <p className="mt-3 font-medium">오늘 몫은 끝났어요</p>
          <p className="mt-1 text-sm text-zinc-500">
            더 하고 싶으면 덱에서 직접 골라 학습할 수 있어요.
          </p>
          <Link
            href="/study/terms"
            className="mt-4 inline-block rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
          >
            과목 용어 보러 가기
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500">복습 카드</p>
              <p className="mt-1 text-2xl font-bold">{dueCount}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500">신규 카드</p>
              <p className="mt-1 text-2xl font-bold">{Math.max(0, newCount)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode("flashcard")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Play className="h-4 w-4" />
              플래시카드로 {sessionCards.length}장 학습
            </button>
            <button
              onClick={() => setMode("quiz")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3.5 text-sm font-medium dark:border-zinc-700"
            >
              <HelpCircle className="h-4 w-4" />
              퀴즈로 풀기
            </button>
          </div>
        </>
      )}
    </div>
  );
}

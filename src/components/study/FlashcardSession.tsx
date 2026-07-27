"use client";

import { useEffect, useCallback, useState } from "react";
import type { Card, SRSRating } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStorage } from "@/context/StorageContext";
import { SessionSummary } from "./SessionSummary";

type Props = {
  cards: Card[];
  onRate: (cardId: string, rating: SRSRating) => void;
  onComplete?: () => void;
};

export function FlashcardSession({ cards, onRate, onComplete }: Props) {
  const { data } = useStorage();
  const showReading = data.settings.showReading;

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [queue, setQueue] = useState(cards);
  const [stats, setStats] = useState({ remembered: 0, shaky: 0, forgotten: 0 });
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    setQueue(cards);
    setIndex(0);
    setFlipped(false);
    setDone(false);
    setStats({ remembered: 0, shaky: 0, forgotten: 0 });
    setWrongIds([]);
  }, [cards]);

  const card = queue[index];

  const handleRate = useCallback(
    (rating: SRSRating) => {
      if (!card) return;
      onRate(card.id, rating);
      setStats((s) => ({
        remembered: s.remembered + (rating === 3 ? 1 : 0),
        shaky: s.shaky + (rating === 2 ? 1 : 0),
        forgotten: s.forgotten + (rating === 1 ? 1 : 0),
      }));
      if (rating <= 2) setWrongIds((ids) => [...ids, card.id]);
      setFlipped(false);
      if (index + 1 >= queue.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    },
    [card, index, queue.length, onRate]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || done) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (flipped) {
        if (e.key === "1") handleRate(1);
        if (e.key === "2") handleRate(2);
        if (e.key === "3") handleRate(3);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, flipped, handleRate, done]);

  if (done) {
    const total = stats.remembered + stats.shaky + stats.forgotten;
    return (
      <SessionSummary
        total={total}
        remembered={stats.remembered}
        shaky={stats.shaky}
        forgotten={stats.forgotten}
        correctRate={total ? Math.round((stats.remembered / total) * 100) : 0}
        elapsedSec={Math.round((Date.now() - startedAt) / 1000)}
        hasWrong={wrongIds.length > 0}
        onRetryWrong={() => {
          const retry = cards.filter((c) => wrongIds.includes(c.id));
          setQueue(retry);
          setIndex(0);
          setWrongIds([]);
          setStats({ remembered: 0, shaky: 0, forgotten: 0 });
          setDone(false);
        }}
        onDone={() => onComplete?.()}
      />
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-lg font-medium">복습할 카드가 없습니다!</p>
        <button onClick={() => onComplete?.()} className="text-sm text-blue-600">
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between text-sm text-zinc-500">
        <span>
          {index + 1} / {queue.length}
        </span>
        <span>스페이스: 뒤집기 · 1/2/3: 평가</span>
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="card-flip w-full"
        aria-label="카드 뒤집기"
      >
        <div className={cn("card-flip-inner relative h-64 w-full", flipped && "flipped")}>
          <div className="card-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-3xl font-bold">{card.front}</p>
            {showReading && card.reading && (
              <p className="mt-2 text-base text-zinc-500">{card.reading}</p>
            )}
            {card.exampleSentence && (
              <p className="mt-4 text-sm text-zinc-500">{card.exampleSentence}</p>
            )}
            <p className="mt-6 text-xs text-zinc-400">탭하여 뒤집기</p>
          </div>
          <div className="card-face card-face-back absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{card.back}</p>
            {(card.onyomi || card.kunyomi) && (
              <div className="mt-3 text-sm text-zinc-500">
                {card.onyomi && <p>음독: {card.onyomi}</p>}
                {card.kunyomi && <p>훈독: {card.kunyomi}</p>}
              </div>
            )}
            {card.notes && <p className="mt-4 text-sm text-zinc-500">{card.notes}</p>}
          </div>
        </div>
      </button>

      {flipped && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            onClick={() => handleRate(1)}
            className="rounded-xl bg-red-100 py-3 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
          >
            모름 (1)
          </button>
          <button
            onClick={() => handleRate(2)}
            className="rounded-xl bg-yellow-100 py-3 text-sm font-medium text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
          >
            헷갈림 (2)
          </button>
          <button
            onClick={() => handleRate(3)}
            className="rounded-xl bg-green-100 py-3 text-sm font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
          >
            기억함 (3)
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { Undo2, Volume2, Lightbulb } from "lucide-react";
import type { Card, CardSRS, SRSRating } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStorage } from "@/context/StorageContext";
import { speak, useSpeechSupport } from "@/lib/speech";
import { SessionSummary } from "./SessionSummary";

/**
 * 정답을 통째로 보여주지 않는 "가림 힌트".
 * 첫 글자와 길이만 노출해서 스스로 떠올릴 여지를 남긴다. (예: accommodate → a·········· (11))
 */
function maskedHint(text: string): string {
  const head = text.slice(0, 1);
  const rest = "·".repeat(Math.max(0, text.length - 1));
  return `${head}${rest} (${text.length})`;
}

type Props = {
  cards: Card[];
  onRate: (cardId: string, rating: SRSRating) => void;
  onComplete?: () => void;
};

const RATING_LABEL: Record<SRSRating, string> = {
  1: "모름",
  2: "헷갈림",
  3: "기억함",
};

/** 방금 매긴 평가 — 되돌리기 한 번 분량만 들고 있는다. */
type LastRating = {
  card: Card;
  rating: SRSRating;
  /** 평가 직전의 SRS 값 */
  previous: CardSRS;
  /** 평가 전에 이미 미해결 오답이었는지 (되돌릴 때 원래 상태로 두기 위해) */
  hadMistake: boolean;
  /** 되돌아갈 큐 위치 */
  index: number;
};

export function FlashcardSession({ cards, onRate, onComplete }: Props) {
  const { data, undoCardRating } = useStorage();
  const showReading = data.settings.showReading;
  const autoSpeak = data.settings.autoSpeak ?? false;
  const speechRate = data.settings.speechRate ?? 1;

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [queue, setQueue] = useState(cards);
  const [stats, setStats] = useState({ remembered: 0, shaky: 0, forgotten: 0 });
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [hinted, setHinted] = useState(false);
  const [lastRating, setLastRating] = useState<LastRating | null>(null);
  const speechSupported = useSpeechSupport();

  /**
   * 평가 직전 값을 읽으려면 화면에 그린 카드가 아니라 저장소의 최신 카드를 봐야 한다.
   * queue는 세션 시작 시점의 스냅샷이라, 틀린 카드 다시 풀기에서 같은 카드를 두 번째로
   * 평가하면 첫 평가 이전 값이 들어가 되돌리기가 어긋난다.
   */
  const liveRef = useRef(data);
  liveRef.current = data;

  useEffect(() => {
    setQueue(cards);
    setIndex(0);
    setFlipped(false);
    setHinted(false);
    setDone(false);
    setStats({ remembered: 0, shaky: 0, forgotten: 0 });
    setWrongIds([]);
    setLastRating(null);
  }, [cards]);

  const card = queue[index];

  /** 카드를 뒤집어 답을 볼 때 앞면을 읽어 준다 (설정에서 켠 경우). */
  useEffect(() => {
    if (!flipped || !autoSpeak || !card) return;
    speak(card.front, { rate: speechRate });
  }, [flipped, autoSpeak, card, speechRate]);

  const handleRate = useCallback(
    (rating: SRSRating) => {
      if (!card) return;
      const live = liveRef.current;
      const previous = live.cards.find((c) => c.id === card.id)?.srs ?? card.srs;
      const hadMistake = live.mistakes.some(
        (m) => m.sourceType === "card" && m.sourceId === card.id && !m.resolved
      );

      onRate(card.id, rating);
      setLastRating({ card, rating, previous, hadMistake, index });
      setStats((s) => ({
        remembered: s.remembered + (rating === 3 ? 1 : 0),
        shaky: s.shaky + (rating === 2 ? 1 : 0),
        forgotten: s.forgotten + (rating === 1 ? 1 : 0),
      }));
      if (rating <= 2) setWrongIds((ids) => [...ids, card.id]);
      setFlipped(false);
      setHinted(false);
      if (index + 1 >= queue.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    },
    [card, index, queue.length, onRate]
  );

  /** 방금 매긴 평가를 무르고 그 카드로 돌아간다. */
  const undo = useCallback(() => {
    if (!lastRating) return;
    const { card: target, rating, previous, hadMistake, index: at } = lastRating;
    undoCardRating(target.id, previous, rating >= 3, hadMistake);
    setStats((s) => ({
      remembered: s.remembered - (rating === 3 ? 1 : 0),
      shaky: s.shaky - (rating === 2 ? 1 : 0),
      forgotten: s.forgotten - (rating === 1 ? 1 : 0),
    }));
    if (rating <= 2) {
      setWrongIds((ids) => {
        const i = ids.lastIndexOf(target.id);
        return i === -1 ? ids : [...ids.slice(0, i), ...ids.slice(i + 1)];
      });
    }
    setDone(false);
    setIndex(at);
    setFlipped(true);
    setHinted(false);
    setLastRating(null);
  }, [lastRating, undoCardRating]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // U / Ctrl+Z 는 카드가 끝난 뒤(요약 화면)에도 눌릴 수 있어야 한다.
      const isUndo = e.key.toLowerCase() === "u" || ((e.ctrlKey || e.metaKey) && e.key === "z");
      if (isUndo && lastRating) {
        e.preventDefault();
        undo();
        return;
      }
      if (!card || done) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        setHinted((h) => !h);
      }
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        speak(card.front, { rate: speechRate });
      }
      if (flipped) {
        if (e.key === "1") handleRate(1);
        if (e.key === "2") handleRate(2);
        if (e.key === "3") handleRate(3);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, flipped, handleRate, done, lastRating, undo, speechRate]);

  const undoBar = lastRating && (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800">
      <span className="min-w-0 truncate text-zinc-500">
        <span className="font-medium text-zinc-700 dark:text-zinc-200">
          {lastRating.card.front}
        </span>
        {` · ${RATING_LABEL[lastRating.rating]}으로 평가함`}
      </span>
      <button
        onClick={undo}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-700"
      >
        <Undo2 className="h-3.5 w-3.5" />
        되돌리기
      </button>
    </div>
  );

  if (done) {
    const total = stats.remembered + stats.shaky + stats.forgotten;
    return (
      <div className="mx-auto max-w-lg">
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
            setLastRating(null);
            setDone(false);
          }}
          onDone={() => onComplete?.()}
        />
        {/* 마지막 카드를 잘못 눌러 세션이 끝나 버린 경우가 가장 아쉬우므로 여기서도 무를 수 있게 */}
        {undoBar}
      </div>
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
      <div className="mb-2 flex items-center justify-between text-sm text-zinc-500">
        <span>
          {index + 1} / {queue.length}
        </span>
        <span className="hidden sm:inline">
          스페이스: 뒤집기 · H: 힌트 · S: 발음 · 1/2/3: 평가 · U: 되돌리기
        </span>
      </div>

      <div className="mb-4 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="card-flip w-full"
        aria-label="카드 뒤집기"
      >
        <div className={cn("card-flip-inner relative h-72 w-full", flipped && "flipped")}>
          <div className="card-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-3xl font-bold">{card.front}</p>
            {showReading && card.reading && (
              <p className="mt-2 text-base text-zinc-500">{card.reading}</p>
            )}
            {card.exampleSentence && (
              <p className="mt-4 text-sm text-zinc-500">{card.exampleSentence}</p>
            )}
            {hinted && (
              <div className="mt-4 max-w-sm rounded-lg bg-amber-50 px-3 py-2 text-center dark:bg-amber-900/20">
                {card.notes ? (
                  <p className="text-sm text-amber-800 dark:text-amber-300">{card.notes}</p>
                ) : (
                  <p className="font-mono text-sm tracking-wide text-amber-800 dark:text-amber-300">
                    {maskedHint(card.back)}
                  </p>
                )}
              </div>
            )}
            <p className="mt-6 text-xs text-zinc-400">탭하여 뒤집기</p>
          </div>
          <div className="card-face card-face-back absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{card.back}</p>
            {(card.onyomi || card.kunyomi) && (
              <div className="mt-3 text-sm text-zinc-500">
                {card.onyomi && <p>음독: {card.onyomi}</p>}
                {card.kunyomi && <p>훈독: {card.kunyomi}</p>}
              </div>
            )}
            {card.notes && (
              <p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-zinc-500">
                {card.notes}
              </p>
            )}
          </div>
        </div>
      </button>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          onClick={() => setHinted((h) => !h)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            hinted
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
          )}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          {hinted ? "힌트 숨기기" : "힌트"}
        </button>
        {speechSupported && (
          <button
            onClick={() => speak(card.front, { rate: speechRate })}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
          >
            <Volume2 className="h-3.5 w-3.5" />
            발음
          </button>
        )}
      </div>

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

      {undoBar}
    </div>
  );
}

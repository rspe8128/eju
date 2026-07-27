"use client";

import { useMemo, useState } from "react";
import type { Card } from "@/lib/types";
import { shuffle } from "@/lib/utils";
import { useStorage } from "@/context/StorageContext";
import { normalizeAnswer } from "@/lib/progress";
import { SessionSummary } from "./SessionSummary";

type Props = {
  cards: Card[];
  poolCards?: Card[];
  direction?: "front-to-back" | "back-to-front";
  onComplete?: () => void;
};

type QuizMode = "mc" | "typed";
type CountOption = 10 | 20 | "all";

export function QuizSession({
  cards,
  poolCards,
  direction: initialDirection = "front-to-back",
  onComplete,
}: Props) {
  const { updateCard, addMistake, resolveMistake } = useStorage();
  const pool = poolCards ?? cards;

  const [direction, setDirection] = useState(initialDirection);
  const [mode, setMode] = useState<QuizMode>("mc");
  const [countOpt, setCountOpt] = useState<CountOption>(10);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [quizCards, setQuizCards] = useState<Card[]>([]);

  const start = (retryIds?: string[]) => {
    const source = retryIds
      ? cards.filter((c) => retryIds.includes(c.id))
      : shuffle(cards);
    const limited =
      retryIds || countOpt === "all"
        ? source
        : source.slice(0, Math.min(source.length, countOpt));
    setQuizCards(limited);
    setIndex(0);
    setSelected(null);
    setTyped("");
    setShowResult(false);
    setStats({ correct: 0, wrong: 0 });
    setWrongIds([]);
    setDone(false);
    setStarted(true);
    setStartedAt(Date.now());
  };

  const card = quizCards[index];

  const options = useMemo(() => {
    if (!card || mode !== "mc") return [];
    if (card.options && card.options.length >= 3 && direction === "front-to-back") {
      const correct = card.back;
      return shuffle([correct, ...card.options.filter((o) => o !== correct)].slice(0, 4));
    }
    const correct = direction === "front-to-back" ? card.back : card.front;
    const others = shuffle(pool.filter((c) => c.id !== card.id))
      .map((c) => (direction === "front-to-back" ? c.back : c.front))
      .filter((v, i, arr) => arr.indexOf(v) === i && v !== correct)
      .slice(0, 3);
    return shuffle([correct, ...others]);
  }, [card, pool, direction, mode]);

  if (!started) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h2 className="font-semibold">퀴즈 설정</h2>
        <label className="flex flex-col gap-1 text-sm">
          방향
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as typeof direction)}
            className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="front-to-back">단어 → 뜻</option>
            <option value="back-to-front">뜻 → 단어</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          모드
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as QuizMode)}
            className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="mc">객관식</option>
            <option value="typed">주관식</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          문제 수
          <select
            value={String(countOpt)}
            onChange={(e) =>
              setCountOpt(e.target.value === "all" ? "all" : (parseInt(e.target.value) as 10 | 20))
            }
            className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="all">전체 ({cards.length})</option>
          </select>
        </label>
        <button
          onClick={() => start()}
          disabled={cards.length === 0}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          시작
        </button>
      </div>
    );
  }

  if (done) {
    const total = stats.correct + stats.wrong;
    return (
      <SessionSummary
        total={total}
        remembered={stats.correct}
        shaky={0}
        forgotten={stats.wrong}
        correctRate={total ? Math.round((stats.correct / total) * 100) : 0}
        elapsedSec={Math.round((Date.now() - startedAt) / 1000)}
        hasWrong={wrongIds.length > 0}
        onRetryWrong={() => start(wrongIds)}
        onDone={() => onComplete?.()}
      />
    );
  }

  if (!card) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-medium">퀴즈할 카드가 없습니다.</p>
      </div>
    );
  }

  const question = direction === "front-to-back" ? card.front : card.back;
  const correctAnswer = direction === "front-to-back" ? card.back : card.front;
  const isFillBlank = Boolean(card.options && card.front.includes("___"));

  const grade = (answer: string) => {
    const correct = normalizeAnswer(answer) === normalizeAnswer(correctAnswer);
    setShowResult(true);
    if (correct) {
      updateCard(card.id, 3);
      resolveMistake("card", card.id);
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      updateCard(card.id, 1);
      addMistake("card", card.id);
      setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
      setWrongIds((ids) => [...ids, card.id]);
    }
  };

  const handleNext = () => {
    setSelected(null);
    setTyped("");
    setShowResult(false);
    if (index + 1 >= quizCards.length) setDone(true);
    else setIndex((i) => i + 1);
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 text-sm text-zinc-500">
        퀴즈 {index + 1} / {quizCards.length}
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <p className="mb-2 text-sm text-zinc-500">
          {isFillBlank ? "빈칸을 채우세요" : "다음의 뜻은?"}
        </p>
        <p className="text-2xl font-bold">{question}</p>
      </div>

      {mode === "mc" ? (
        <div className="space-y-3">
          {options.map((option) => {
            let style = "border-zinc-200 hover:border-blue-300 dark:border-zinc-700";
            if (showResult && option === correctAnswer) {
              style = "border-green-500 bg-green-50 dark:bg-green-900/20";
            } else if (showResult && option === selected && option !== correctAnswer) {
              style = "border-red-500 bg-red-50 dark:bg-red-900/20";
            }
            return (
              <button
                key={option}
                onClick={() => {
                  if (showResult) return;
                  setSelected(option);
                  grade(option);
                }}
                disabled={showResult}
                className={`w-full rounded-xl border p-4 text-left text-sm font-medium transition-colors ${style}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={showResult}
            onKeyDown={(e) => {
              if (e.key === "Enter" && typed && !showResult) grade(typed);
            }}
            placeholder="정답 입력"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {!showResult && (
            <button
              onClick={() => typed && grade(typed)}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white"
            >
              제출
            </button>
          )}
          {showResult && (
            <p
              className={`text-sm ${
                normalizeAnswer(typed) === normalizeAnswer(correctAnswer)
                  ? "text-green-600"
                  : "text-red-500"
              }`}
            >
              정답: {correctAnswer}
            </p>
          )}
        </div>
      )}

      {showResult && (
        <button
          onClick={handleNext}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          {index + 1 >= quizCards.length ? "결과 보기" : "다음"}
        </button>
      )}
    </div>
  );
}

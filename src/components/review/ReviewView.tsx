"use client";

import { useMemo, useState } from "react";
import {
  Check,
  X,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  RotateCcw,
  FileText,
} from "lucide-react";
import { useStorage, useUnresolvedMistakes } from "@/context/StorageContext";
import { FlashcardSession } from "@/components/study/FlashcardSession";
import { QuizSession } from "@/components/study/QuizSession";
import { PassageView } from "@/components/mock/PassageView";
import { QuestionView } from "@/components/mock/QuestionView";
import { resolveMockMistake } from "@/lib/mock/mistakeIds";
import { findPassage } from "@/lib/mock/types";
import type { MockPaper, MockQuestion, MockSection } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

type Tab = "card" | "problem" | "mock";

/** 오답 하나 + registry에서 되찾은 문항 */
type MockMistake = {
  sourceId: string;
  paper: MockPaper;
  section: MockSection;
  question: MockQuestion;
};

export function ReviewView() {
  const { data, updateCard, resolveMistake, markProblemSolved } = useStorage();
  const mistakes = useUnresolvedMistakes();
  const [mode, setMode] = useState<"list" | "flash" | "quiz" | "mockQuiz">("list");

  const mistakeCards = mistakes
    .filter((m) => m.sourceType === "card")
    .map((m) => data.cards.find((c) => c.id === m.sourceId))
    .filter(Boolean) as typeof data.cards;

  const problemMistakes = mistakes.filter((m) => m.sourceType === "problem");

  /**
   * 모의고사 오답은 id만 저장돼 있으므로 여기서 문항을 되찾는다.
   * 회차가 사라졌거나 문항 id가 바뀌면 되찾지 못하는데, 그건 목록에서 조용히 빼고
   * "해제" 버튼만 남긴다 (죽은 항목이 영구히 쌓이지 않게).
   */
  const mockMistakes = useMemo<MockMistake[]>(() => {
    const out: MockMistake[] = [];
    for (const m of mistakes) {
      if (m.sourceType !== "mock") continue;
      const hit = resolveMockMistake(m.sourceId);
      if (!hit) continue;
      out.push({ sourceId: m.sourceId, ...hit });
    }
    return out;
  }, [mistakes]);

  const orphanMockIds = mistakes
    .filter((m) => m.sourceType === "mock" && !resolveMockMistake(m.sourceId))
    .map((m) => m.sourceId);

  // 첫 화면은 실제로 오답이 있는 탭으로 연다. 빈 탭을 보여줘 봐야 소용이 없다.
  const [tab, setTab] = useState<Tab>(() => {
    if (mistakeCards.length > 0) return "card";
    if (mockMistakes.length > 0) return "mock";
    if (problemMistakes.length > 0) return "problem";
    return "card";
  });

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

  if (mode === "mockQuiz" && mockMistakes.length > 0) {
    return (
      <MockRetryQuiz
        items={mockMistakes}
        onCorrect={(sourceId) => resolveMistake("mock", sourceId)}
        onExit={() => setMode("list")}
      />
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "card", label: "카드", count: mistakeCards.length },
    { id: "problem", label: "문제", count: problemMistakes.length },
    { id: "mock", label: "모의고사", count: mockMistakes.length + orphanMockIds.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">오답노트</h1>
          <p className="text-sm text-zinc-500">전 과목 통합 · {mistakes.length}개 미해결</p>
        </div>
        {tab === "card" && mistakeCards.length > 0 && (
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
        {tab === "mock" && mockMistakes.length > 0 && (
          <button
            onClick={() => setMode("mockQuiz")}
            className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            <RotateCcw className="h-4 w-4" />
            틀린 문항만 다시 풀기 ({mockMistakes.length})
          </button>
        )}
      </div>

      {/* 카드 오답과 모의고사 오답은 복습하는 방법이 다르므로 섞지 않는다 */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-red-500 text-red-600 dark:text-red-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums text-xs text-zinc-400">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "card" &&
        (mistakeCards.length === 0 ? (
          <EmptyTab message="카드 오답이 없습니다. 잘하고 있어요!" href="/study/japanese" hrefLabel="학습하러 가기" />
        ) : (
          <div className="space-y-3">
            {mistakeCards.map((card) => {
              const deck = data.decks.find((d) => d.id === card.deckId);
              return (
                <div
                  key={card.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{card.front}</p>
                    <p className="text-sm text-zinc-500">{card.back}</p>
                    <p className="mt-1 text-xs text-zinc-400">{deck?.title}</p>
                  </div>
                  <button
                    onClick={() => resolveMistake("card", card.id)}
                    className="shrink-0 rounded-lg p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    title="해결됨"
                    aria-label="해결됨"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>
        ))}

      {tab === "problem" &&
        (problemMistakes.length === 0 ? (
          <EmptyTab message="교과목 문제 오답이 없습니다." href="/study/subjects" hrefLabel="교과목으로" />
        ) : (
          <div className="space-y-3">
            {problemMistakes.map((m) => {
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
        ))}

      {tab === "mock" &&
        (mockMistakes.length === 0 && orphanMockIds.length === 0 ? (
          <EmptyTab message="모의고사 오답이 없습니다." href="/mock" hrefLabel="모의고사 풀러 가기" />
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-zinc-500">
              문항 내용은 저장하지 않는다. 회차·문항 번호만 남기고 펼칠 때 원본에서 불러오므로,
              오답이 쌓여도 저장 공간을 거의 쓰지 않는다.
            </p>
            {mockMistakes.map((m) => (
              <MockMistakeCard
                key={m.sourceId}
                mistake={m}
                onResolve={() => resolveMistake("mock", m.sourceId)}
              />
            ))}
            {orphanMockIds.map((id) => (
              <div
                key={id}
                className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700"
              >
                <span className="min-w-0 truncate text-zinc-500">
                  찾을 수 없는 문항 ({id})
                </span>
                <button
                  onClick={() => resolveMistake("mock", id)}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  title="해제"
                  aria-label="해제"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

function EmptyTab({
  message,
  href,
  hrefLabel,
}: {
  message: string;
  href: string;
  hrefLabel: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
      <p className="mb-2 text-zinc-500">{message}</p>
      <a href={href} className="text-sm text-blue-600 hover:underline">
        {hrefLabel}
      </a>
    </div>
  );
}

/**
 * 모의고사 오답 한 건.
 * 펼치면 지문·발문·선택지·해설이 전부 나온다. 번역 토글과 후리가나 토글은
 * 모의고사 화면에서 쓰는 컴포넌트를 그대로 재사용하므로 동작이 같다.
 */
function MockMistakeCard({
  mistake,
  onResolve,
}: {
  mistake: MockMistake;
  onResolve: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { paper, section, question } = mistake;
  const passage = findPassage(section, question.passageId);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {paper.title} · {question.number}번
            </span>
            <span className="ja-ui mt-0.5 block truncate text-xs text-zinc-500">
              {question.stemJa}
            </span>
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
          />
        </button>
        <button
          onClick={onResolve}
          className="shrink-0 rounded-lg p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
          title="해결됨"
          aria-label="해결됨"
        >
          <Check className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-zinc-100 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-400">{section.label}</p>
          {passage && <PassageView passage={passage} review />}
          <QuestionView
            question={question}
            subjectCode={paper.subjectCode}
            picked={undefined}
            review
          />
        </div>
      )}
    </div>
  );
}

/**
 * 틀린 모의고사 문항만 모아 다시 푼다.
 * 목록은 들어올 때 한 번 고정한다 — 맞힌 문항을 곧바로 resolved 처리하면
 * 부모의 목록이 줄어들어 진행 중에 순서가 어긋난다.
 */
function MockRetryQuiz({
  items,
  onCorrect,
  onExit,
}: {
  items: MockMistake[];
  onCorrect: (sourceId: string) => void;
  onExit: () => void;
}) {
  const [queue] = useState(() => items);
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const cur = queue[cursor];
  const done = cursor >= queue.length;

  const reveal = () => {
    if (!cur || !picked) return;
    setRevealed(true);
    if (picked === cur.question.answer) {
      setCorrectCount((n) => n + 1);
      onCorrect(cur.sourceId);
    }
  };

  const next = () => {
    setPicked(undefined);
    setRevealed(false);
    setCursor((c) => c + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (done || !cur) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h2 className="text-lg font-semibold">다시 풀기 완료</h2>
        <p className="text-3xl font-bold tabular-nums">
          {correctCount}
          <span className="text-xl font-medium text-zinc-400"> / {queue.length}</span>
        </p>
        <p className="text-sm text-zinc-500">
          맞힌 문항은 오답노트에서 해결 처리됐다. 틀린 것은 그대로 남아 있으니 해설을 다시 읽자.
        </p>
        <button
          onClick={onExit}
          className="rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
        >
          오답노트로
        </button>
      </div>
    );
  }

  const passage = findPassage(cur.section, cur.question.passageId);

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onExit}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          나가기
        </button>
        <p className="text-sm text-zinc-500 tabular-nums">
          {cursor + 1} / {queue.length} · {cur.paper.title}
        </p>
      </div>

      <div className={cn("grid gap-4", passage && "lg:grid-cols-2")}>
        {passage && (
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
            <PassageView passage={passage} />
          </div>
        )}
        <div className="space-y-4">
          <QuestionView
            question={cur.question}
            subjectCode={cur.paper.subjectCode}
            picked={picked}
            onPick={revealed ? undefined : setPicked}
            review={revealed}
          />
          {revealed ? (
            <button
              onClick={next}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              {cursor + 1 === queue.length ? "결과 보기" : "다음 문항"}
            </button>
          ) : (
            <button
              onClick={reveal}
              disabled={!picked}
              className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
            >
              정답 확인
            </button>
          )}
        </div>
      </div>
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

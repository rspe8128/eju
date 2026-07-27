"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Grid3x3,
  Pause,
  Play,
  Timer,
  Flag,
  AlertTriangle,
} from "lucide-react";
import type { MockPaper, MockSection, MockAnswerMap } from "@/lib/mock/types";
import { findPassage } from "@/lib/mock/types";
import { formatClock } from "@/lib/mockExam";
import { loadProgress, saveProgress, clearProgress } from "@/lib/mock/progress";
import { useStorage } from "@/context/StorageContext";
import { todayString } from "@/lib/utils";
import type { AttemptResult } from "@/lib/types";
import { PassageView } from "./PassageView";
import { QuestionView } from "./QuestionView";
import { MockResultView } from "./MockResultView";
import { cn } from "@/lib/utils";

type Phase = "solving" | "result" | "review";

export function MockRunner({
  paper,
  section,
  onExit,
}: {
  paper: MockPaper;
  section: MockSection;
  onExit: () => void;
}) {
  const { addExamAttempt } = useStorage();

  const [answers, setAnswers] = useState<MockAnswerMap>({});
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<Phase>("solving");
  const [gridOpen, setGridOpen] = useState(false);

  const [useTimer, setUseTimer] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(section.minutes * 60);
  const [running, setRunning] = useState(true);
  const [timeUp, setTimeUp] = useState(false);

  const startedAt = useRef<number>(Date.now());
  const restored = useRef(false);

  const questions = section.questions;
  const question = questions[cursor];
  const passage = findPassage(section, question?.passageId);

  // ── 이어 풀기 ────────────────────────────────────────────
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = loadProgress(paper.id, section.id);
    if (saved && !saved.submitted && Object.keys(saved.answers).length > 0) {
      setAnswers(saved.answers);
      setCursor(Math.min(saved.cursor, questions.length - 1));
      if (saved.secondsLeft !== null) setSecondsLeft(saved.secondsLeft);
    }
  }, [paper.id, section.id, questions.length]);

  // ── 진행 상황 저장 ───────────────────────────────────────
  useEffect(() => {
    if (phase !== "solving" || !restored.current) return;
    // 아직 아무것도 안 했으면 저장하지 않는다 (빈 기록이 목록에 "이어 풀기"로 뜨는 걸 막는다)
    if (Object.keys(answers).length === 0 && cursor === 0) return;
    saveProgress({
      paperId: paper.id,
      sectionId: section.id,
      answers,
      secondsLeft: useTimer ? secondsLeft : null,
      cursor,
      updatedAt: new Date().toISOString(),
      submitted: false,
    });
  }, [answers, cursor, secondsLeft, useTimer, phase, paper.id, section.id]);

  // ── 타이머 ───────────────────────────────────────────────
  // 상태 갱신 함수 안에서 다른 상태를 건드리지 않는다(StrictMode에서 두 번 실행되므로).
  // 카운트다운과 "시간 종료 처리"를 두 개의 effect로 나눈다.
  useEffect(() => {
    if (!useTimer || !running || phase !== "solving") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [useTimer, running, phase]);

  useEffect(() => {
    if (secondsLeft === 0 && useTimer && phase === "solving" && !timeUp) {
      setTimeUp(true);
      setRunning(false);
    }
  }, [secondsLeft, useTimer, phase, timeUp]);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id]).length,
    [questions, answers]
  );

  const pick = useCallback(
    (key: string) => {
      if (!question) return;
      setAnswers((prev) => ({ ...prev, [question.id]: key }));
    },
    [question]
  );

  const go = useCallback(
    (delta: number) => {
      setCursor((c) => Math.max(0, Math.min(questions.length - 1, c + delta)));
      setGridOpen(false);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [questions.length]
  );

  // ── 키보드 ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (phase === "solving" && /^[1-6]$/.test(e.key)) {
        const exists = question?.choices.some((c) => c.key === e.key);
        if (exists) pick(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, pick, phase, question]);

  // ── 채점 ─────────────────────────────────────────────────
  const results: AttemptResult[] = useMemo(
    () =>
      questions.map((q) => {
        const picked = answers[q.id] ?? "";
        return {
          q: q.number,
          picked,
          answer: q.answer,
          correct: picked === q.answer,
          topicId: q.topicId,
        };
      }),
    [questions, answers]
  );

  const correctCount = results.filter((r) => r.correct).length;

  const submit = useCallback(() => {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    addExamAttempt({
      paperId: `${paper.id}:${section.id}`,
      subjectCode: paper.subjectCode,
      date: todayString(),
      responses: questions.map((q) => answers[q.id] ?? ""),
      correctCount: results.filter((r) => r.correct).length,
      totalCount: questions.length,
      minutes,
      results,
      memo: `${paper.title} · ${section.label}`,
    });
    clearProgress(paper.id, section.id);
    setRunning(false);
    setPhase("result");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [addExamAttempt, answers, paper, questions, results, section]);

  const startReview = () => {
    setPhase("review");
    setCursor(0);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!question) {
    return (
      <div className="py-16 text-center text-sm text-zinc-500">
        이 세션에는 아직 문항이 없습니다.
        <button onClick={onExit} className="mt-4 block w-full text-blue-600">
          돌아가기
        </button>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <MockResultView
        paper={paper}
        section={section}
        results={results}
        correctCount={correctCount}
        onReview={startReview}
        onExit={onExit}
        onRetry={() => {
          setAnswers({});
          setCursor(0);
          setSecondsLeft(section.minutes * 60);
          setTimeUp(false);
          setRunning(true);
          startedAt.current = Date.now();
          setPhase("solving");
        }}
      />
    );
  }

  const review = phase === "review";

  return (
    <div className="pb-28">
      {/* 상단 바 — AppShell 헤더(약 3.5rem) 바로 아래에 붙인다 */}
      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            나가기
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-xs text-zinc-400">{paper.title}</p>
            <p className="truncate text-sm font-semibold">
              {section.label}
              {review && <span className="ml-1.5 text-blue-600">· 해설</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!review && useTimer && (
              <button
                onClick={() => setRunning((r) => !r)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-sm font-semibold tabular-nums",
                  timeUp
                    ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/30"
                    : secondsLeft <= 300
                      ? "border-amber-300 text-amber-600 dark:border-amber-800"
                      : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                )}
              >
                {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {formatClock(secondsLeft)}
              </button>
            )}
            {!review && !useTimer && (
              <button
                onClick={() => setUseTimer(true)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-500 dark:border-zinc-700"
              >
                <Timer className="h-3.5 w-3.5" />
                타이머
              </button>
            )}
          </div>
        </div>

        {/* 진행 바 */}
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${((cursor + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-zinc-500">
            {cursor + 1} / {questions.length}
            {!review && (
              <span className="ml-1.5 text-zinc-400">· 응답 {answeredCount}</span>
            )}
          </span>
          <button
            onClick={() => setGridOpen((v) => !v)}
            className="shrink-0 rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:hover:text-white"
            aria-label="문항 목록"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
        </div>

        {gridOpen && (
          <div className="mt-3 grid grid-cols-8 gap-1.5 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800 sm:grid-cols-13">
            {questions.map((q, i) => {
              const done = !!answers[q.id];
              const ok = review && answers[q.id] === q.answer;
              const bad = review && !ok;
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCursor(i);
                    setGridOpen(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-md text-xs font-medium transition-colors",
                    i === cursor && "ring-2 ring-blue-500",
                    review
                      ? ok
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : bad
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          : ""
                      : done
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                  )}
                >
                  {q.number}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {timeUp && !review && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            제한 시간이 끝났다. 실전이라면 여기까지가 점수다. 계속 풀어도 되지만, 지금까지 몇 번까지
            풀었는지 기억해 두고 채점 후 비교하자.
          </span>
        </div>
      )}

      {/* 본문 */}
      <div className={cn("grid gap-4", passage && "lg:grid-cols-2")}>
        {passage && (
          <div className="lg:sticky lg:top-[9.5rem] lg:max-h-[calc(100vh-13rem)] lg:self-start lg:overflow-y-auto">
            <PassageView passage={passage} />
          </div>
        )}
        <div className="space-y-4">
          <QuestionView
            question={question}
            subjectCode={paper.subjectCode}
            picked={answers[question.id]}
            onPick={review ? undefined : pick}
            review={review}
          />
          {!review && (
            <p className="px-1 text-[11px] text-zinc-400">
              단축키: ← → 문항 이동 · 숫자 키 1~4 답 선택
            </p>
          )}
        </div>
      </div>

      {/* 하단 고정 바 */}
      {/* 모바일에서는 AppShell의 하단 탭(약 3.5rem) 위에 놓는다 */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 lg:bottom-0 lg:left-60">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <button
            onClick={() => go(-1)}
            disabled={cursor === 0}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            이전
          </button>

          {cursor < questions.length - 1 ? (
            <button
              onClick={() => go(1)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              다음
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : review ? (
            <button
              onClick={onExit}
              className="flex-1 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
            >
              해설 끝 · 목록으로
            </button>
          ) : (
            <button
              onClick={submit}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <Flag className="h-4 w-4" />
              제출하고 채점
            </button>
          )}

          {!review && cursor < questions.length - 1 && (
            <button
              onClick={submit}
              className="rounded-xl border border-green-500 px-3 py-2.5 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              제출
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

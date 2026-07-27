"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, SkipForward, Timer, CheckCircle2 } from "lucide-react";
import { MOCK_PLANS, formatClock, type MockSubjectPlan } from "@/lib/mockExam";
import { useStorage } from "@/context/StorageContext";
import { cn } from "@/lib/utils";

export function MockExamView() {
  const { addFocusSession } = useStorage();
  const [plan, setPlan] = useState<MockSubjectPlan | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const startedAtRef = useRef<string | null>(null);

  const phase = plan?.phases[phaseIndex];

  const notify = useCallback((title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }, []);

  const startPlan = (p: MockSubjectPlan) => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") Notification.requestPermission();
    }
    setPlan(p);
    setPhaseIndex(0);
    setSecondsLeft(p.phases[0].minutes * 60);
    setRunning(true);
    setFinished(false);
    startedAtRef.current = new Date().toISOString();
  };

  const finishSession = useCallback(() => {
    setRunning(false);
    setFinished(true);
    if (plan && startedAtRef.current) {
      addFocusSession({
        startedAt: startedAtRef.current,
        minutes: plan.totalMinutes,
        subjectId: plan.code,
      });
    }
    notify("모의고사 종료", "수고했어요. 채점하고 오답을 정리하세요.");
  }, [plan, addFocusSession, notify]);

  const nextPhase = useCallback(() => {
    if (!plan) return;
    if (phaseIndex + 1 >= plan.phases.length) {
      finishSession();
      return;
    }
    const next = phaseIndex + 1;
    setPhaseIndex(next);
    setSecondsLeft(plan.phases[next].minutes * 60);
    notify("다음 영역 시작", plan.phases[next].label);
  }, [plan, phaseIndex, finishSession, notify]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          nextPhase();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, nextPhase]);

  const reset = () => {
    setPlan(null);
    setRunning(false);
    setFinished(false);
    setPhaseIndex(0);
    setSecondsLeft(0);
    startedAtRef.current = null;
  };

  if (!plan) {
    return (
      <div>
        <header className="mb-6">
          <h1 className="text-2xl font-bold">모의고사 타이머</h1>
          <p className="mt-1 text-sm text-zinc-500">
            EJU 실전 시간표대로 타이머가 진행된다. 기출 문제를 옆에 두고 시작하자.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {MOCK_PLANS.map((p) => (
            <button
              key={p.code}
              onClick={() => startPlan(p)}
              className="rounded-2xl border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.label}</span>
                <span className="flex items-center gap-1 text-sm text-zinc-500">
                  <Timer className="h-4 w-4" />
                  {p.totalMinutes}분
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                {p.phases.map((ph) => (
                  <li key={ph.id}>
                    · {ph.label} {ph.minutes}분
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          실전에서는 영역 사이에 쉬는 시간이 없다. 타이머를 멈추지 말고 끝까지 진행하는 연습을 하자.
        </p>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
        <h2 className="mt-4 text-xl font-bold">{plan.label} 모의고사 종료</h2>
        <p className="mt-2 text-sm text-zinc-500">
          총 {plan.totalMinutes}분 집중 기록이 저장됐다. 채점 후 점수를 성적 페이지에 기록하자.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <a
            href="/scores"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            점수 기록하기
          </a>
          <button
            onClick={reset}
            className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm dark:border-zinc-700"
          >
            처음으로
          </button>
        </div>
      </div>
    );
  }

  const totalPhaseSeconds = (phase?.minutes ?? 1) * 60;
  const progress = 1 - secondsLeft / totalPhaseSeconds;
  const isLastMinute = secondsLeft <= 60;

  return (
    <div className="mx-auto max-w-xl">
      <button onClick={reset} className="mb-4 text-sm text-zinc-500">
        ← 나가기
      </button>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
        <p className="text-sm text-zinc-500">{plan.label}</p>
        <h2 className="mt-1 text-xl font-bold">{phase?.label}</h2>

        <p
          className={cn(
            "mt-6 font-mono text-6xl font-bold tabular-nums",
            isLastMinute ? "text-red-500" : "text-zinc-900 dark:text-white"
          )}
        >
          {formatClock(secondsLeft)}
        </p>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isLastMinute ? "bg-red-500" : "bg-blue-500"
            )}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>

        <p className="mt-4 text-xs text-zinc-500">{phase?.hint}</p>

        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "일시정지" : "계속"}
          </button>
          <button
            onClick={nextPhase}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 px-5 py-2.5 text-sm dark:border-zinc-700"
          >
            <SkipForward className="h-4 w-4" />
            다음 영역
          </button>
          <button
            onClick={() => setSecondsLeft((phase?.minutes ?? 0) * 60)}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 px-5 py-2.5 text-sm dark:border-zinc-700"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ol className="mt-6 space-y-2">
        {plan.phases.map((ph, i) => (
          <li
            key={ph.id}
            className={cn(
              "flex items-center justify-between rounded-xl border px-4 py-3 text-sm",
              i === phaseIndex
                ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
                : i < phaseIndex
                  ? "border-zinc-200 text-zinc-400 line-through dark:border-zinc-700"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
            )}
          >
            <span>
              {i + 1}. {ph.label}
            </span>
            <span>{ph.minutes}분</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

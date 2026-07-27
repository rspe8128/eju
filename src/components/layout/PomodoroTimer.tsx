"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useStorage } from "@/context/StorageContext";

export function PomodoroTimer() {
  const { data, addFocusSession, updateSettings } = useStorage();
  const workMin = data.settings.pomodoroWork;
  const breakMin = data.settings.pomodoroBreak;

  const [mode, setMode] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(workMin * 60);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const startedAt = useRef<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setRunning(false);
          if (mode === "work" && startedAt.current) {
            addFocusSession({
              startedAt: startedAt.current,
              minutes: workMin,
            });
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("집중 세션 완료!", { body: `${workMin}분 완료. 휴식하세요.` });
            }
          }
          const nextMode = mode === "work" ? "break" : "work";
          setMode(nextMode);
          return (nextMode === "work" ? workMin : breakMin) * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, mode, workMin, breakMin, addFocusSession]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const start = async () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (mode === "work") startedAt.current = new Date().toISOString();
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft((mode === "work" ? workMin : breakMin) * 60);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        aria-label="뽀모도로 타이머"
      >
        <Timer className="h-4 w-4" />
        <span className="font-mono">
          {mm}:{ss}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-2 text-xs text-zinc-500">
            {mode === "work" ? "집중" : "휴식"} · {workMin}/{breakMin}분
          </p>
          <p className="mb-3 text-center font-mono text-3xl font-bold">
            {mm}:{ss}
          </p>
          <div className="mb-3 flex justify-center gap-2">
            {!running ? (
              <button
                onClick={start}
                className="rounded-lg bg-red-500 p-2 text-white hover:bg-red-600"
                aria-label="시작"
              >
                <Play className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setRunning(false)}
                className="rounded-lg bg-zinc-200 p-2 dark:bg-zinc-700"
                aria-label="일시정지"
              >
                <Pause className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={reset}
              className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800"
              aria-label="리셋"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex flex-col gap-1">
              집중(분)
              <input
                type="number"
                min={1}
                value={workMin}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 25;
                  updateSettings({ pomodoroWork: v });
                  if (!running && mode === "work") setSecondsLeft(v * 60);
                }}
                className="rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </label>
            <label className="flex flex-col gap-1">
              휴식(분)
              <input
                type="number"
                min={1}
                value={breakMin}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 5;
                  updateSettings({ pomodoroBreak: v });
                  if (!running && mode === "break") setSecondsLeft(v * 60);
                }}
                className="rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

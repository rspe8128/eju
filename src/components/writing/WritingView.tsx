"use client";

import { useEffect, useState } from "react";
import { useStorage } from "@/context/StorageContext";
import { writingPrompts } from "@/lib/data/writingPrompts";
import { todayString } from "@/lib/utils";

export function WritingView() {
  const { data, addWritingEntry, removeWritingEntry } = useStorage();
  const [promptId, setPromptId] = useState(writingPrompts[0].id);
  const [body, setBody] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [running, setRunning] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const prompt = writingPrompts.find((p) => p.id === promptId)!;
  const charCount = body.length;
  const inRange = charCount >= 400 && charCount <= 500;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const handleSave = () => {
    if (!body.trim()) return;
    addWritingEntry({
      date: todayString(),
      prompt: prompt.prompt,
      body,
      charCount,
      minutes: minutes - Math.floor(secondsLeft / 60),
    });
    setBody("");
    setRunning(false);
    setSecondsLeft(minutes * 60);
  };

  const viewing = data.writingEntries.find((e) => e.id === viewId);

  if (viewing) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button onClick={() => setViewId(null)} className="text-sm text-zinc-500">
          ← 목록
        </button>
        <p className="text-sm text-zinc-500">{viewing.date}</p>
        <p className="rounded-lg bg-zinc-50 p-4 text-sm dark:bg-zinc-800">{viewing.prompt}</p>
        <div className="whitespace-pre-wrap rounded-xl border border-zinc-200 p-6 text-sm leading-relaxed dark:border-zinc-700">
          {viewing.body}
        </div>
        <p className="text-xs text-zinc-400">
          {viewing.charCount}자 · {viewing.minutes}분
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">記述 (작문) 연습</h1>
        <p className="text-sm text-zinc-500">EJU 형식 · 400~500자 · 30분</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={promptId}
          onChange={(e) => setPromptId(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          {writingPrompts.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.type === "debate" ? "찬반" : "설명"}] {p.title}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={5}
          value={minutes}
          onChange={(e) => {
            const v = parseInt(e.target.value) || 30;
            setMinutes(v);
            if (!running) setSecondsLeft(v * 60);
          }}
          className="w-20 rounded-lg border border-zinc-200 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        <span className="font-mono text-lg font-bold">
          {mm}:{ss}
        </span>
        <button
          onClick={() => setRunning((r) => !r)}
          className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white"
        >
          {running ? "일시정지" : "시작"}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-800/50">
        {prompt.prompt}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={14}
        placeholder="ここに書いてください。である体で。"
        className="w-full rounded-xl border border-zinc-200 p-4 text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-800"
      />

      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium ${
            inRange ? "text-green-600" : charCount > 500 ? "text-red-500" : "text-zinc-500"
          }`}
        >
          {charCount}자 {inRange ? "(적정 범위)" : charCount < 400 ? "(400자 이상 권장)" : "(500자 초과)"}
        </span>
        <button
          onClick={handleSave}
          disabled={!body.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          저장
        </button>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">과거 작성물</h2>
        {data.writingEntries.length === 0 ? (
          <p className="text-sm text-zinc-500">아직 작성물이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {[...data.writingEntries].reverse().map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700"
              >
                <button onClick={() => setViewId(e.id)} className="text-left text-sm hover:underline">
                  {e.date} · {e.charCount}자 · {e.prompt.slice(0, 40)}…
                </button>
                <button
                  onClick={() => removeWritingEntry(e.id)}
                  className="text-xs text-red-500"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

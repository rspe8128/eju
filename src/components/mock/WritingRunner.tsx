"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Pause, Play, Save, CheckCircle2, Sparkles } from "lucide-react";
import type { MockPaper, MockSection, MockWritingPrompt } from "@/lib/mock/types";
import { formatClock } from "@/lib/mockExam";
import { useTranslate } from "@/lib/mock/useTranslate";
import { loadWritingDraft, saveWritingDraft } from "@/lib/mock/progress";
import { useStorage } from "@/context/StorageContext";
import { todayString } from "@/lib/utils";
import { TranslateButton, TranslateError } from "./TranslateButton";
import { cn } from "@/lib/utils";

/** 원고지 기준 글자 수 — 공백·줄바꿈은 세지 않는다. */
function countChars(text: string): number {
  return text.replace(/\s/g, "").length;
}

function PromptCard({
  prompt,
  selected,
  onSelect,
}: {
  prompt: MockWritingPrompt;
  selected: boolean;
  onSelect: () => void;
}) {
  const tr = useTranslate([prompt.ja]);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white transition-colors dark:bg-zinc-800",
        selected
          ? "border-blue-500 ring-1 ring-blue-500"
          : "border-zinc-200 dark:border-zinc-700"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-700">
        <span className="text-sm font-semibold">テーマ {prompt.number}</span>
        <TranslateButton
          shown={tr.shown}
          loading={tr.loading}
          cached={tr.cached}
          onClick={tr.toggle}
          label="번역"
        />
      </div>
      <div className="px-4 py-4">
        <p className="ja-body text-[15px]">{prompt.ja}</p>
        {tr.shown && tr.lines[0] && (
          <p className="mt-3 rounded-xl bg-blue-50/70 p-3 text-sm leading-relaxed text-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
            {tr.lines[0]}
          </p>
        )}
        {tr.error && <TranslateError message={tr.error} />}
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          {prompt.hintKo}
        </p>
        <button
          onClick={onSelect}
          className={cn(
            "mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
            selected
              ? "bg-blue-600 text-white"
              : "border border-zinc-200 hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700"
          )}
        >
          {selected ? "이 주제로 쓰는 중" : "이 주제로 쓰기"}
        </button>
      </div>
    </div>
  );
}

export function WritingRunner({
  paper,
  section,
  onExit,
}: {
  paper: MockPaper;
  section: MockSection;
  onExit: () => void;
}) {
  const { addWritingEntry } = useStorage();
  const prompts = section.writingPrompts ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(section.minutes * 60);
  const [running, setRunning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const restored = useRef(false);

  const selected = prompts.find((p) => p.id === selectedId) ?? null;
  const chars = countChars(body);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const draft = loadWritingDraft(paper.id);
    if (draft && prompts.some((p) => p.id === draft.promptId)) {
      setSelectedId(draft.promptId);
      setBody(draft.body);
    }
  }, [paper.id, prompts]);

  useEffect(() => {
    if (!selectedId || submitted) return;
    saveWritingDraft({
      paperId: paper.id,
      promptId: selectedId,
      body,
      updatedAt: new Date().toISOString(),
    });
  }, [body, selectedId, paper.id, submitted]);

  useEffect(() => {
    if (!running || submitted) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running, submitted]);

  const choose = useCallback((id: string) => {
    setSelectedId(id);
    setRunning(true);
    startedAt.current = Date.now();
  }, []);

  const finish = () => {
    setRunning(false);
    setSubmitted(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const persist = () => {
    if (!selected) return;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    addWritingEntry({
      date: todayString(),
      prompt: selected.ja,
      body,
      charCount: chars,
      minutes,
      selfScore: Object.values(checked).filter(Boolean).length,
      memo: `${paper.title} · 기술 테마${selected.number}`,
    });
    setSaved(true);
  };

  if (prompts.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-zinc-500">
        이 회차에는 기술 문제가 없습니다.
        <button onClick={onExit} className="mt-4 block w-full text-blue-600">
          돌아가기
        </button>
      </div>
    );
  }

  const inRange = chars >= 400 && chars <= 500;

  return (
    <div className="pb-16">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={onExit}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          나가기
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs text-zinc-400">{paper.title}</p>
          <p className="truncate text-sm font-semibold">{section.label}</p>
        </div>
        {selectedId && !submitted ? (
          <button
            onClick={() => setRunning((r) => !r)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-sm font-semibold tabular-nums",
              secondsLeft === 0
                ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/30"
                : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            )}
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {formatClock(secondsLeft)}
          </button>
        ) : (
          <span className="w-20" />
        )}
      </div>

      {!submitted && (
        <>
          <p className="ja-ui mb-4 rounded-xl border border-zinc-200 bg-white p-3.5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {section.instructionsJa}
          </p>
          <p className="mb-4 rounded-xl bg-blue-50 p-3.5 text-xs leading-relaxed text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            {section.hintKo}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {prompts.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                selected={selectedId === p.id}
                onSelect={() => choose(p.id)}
              />
            ))}
          </div>
        </>
      )}

      {selected && (
        <div className="mt-6">
          {submitted && (
            <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-xs text-zinc-400">선택한 주제</p>
              <p className="ja-body mt-1 text-[15px]">{selected.ja}</p>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-700">
              <span className="text-sm font-semibold">답안</span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  inRange ? "text-green-600" : chars > 500 ? "text-red-500" : "text-zinc-400"
                )}
              >
                {chars}자
                <span className="ml-1 text-xs font-normal text-zinc-400">/ 400~500</span>
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              readOnly={submitted}
              rows={16}
              placeholder="ここに書く。「である体」で統一すること。"
              className="ja-body w-full resize-y bg-transparent p-4 text-[15px] outline-none"
            />
          </div>

          {!submitted ? (
            <button
              onClick={finish}
              disabled={chars === 0}
              className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
            >
              다 썼다 · 자가 채점으로
            </button>
          ) : (
            <>
              <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  자가 채점 체크리스트
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  자기 글을 소리 내어 한 번 읽으면서 하나씩 확인하자.
                </p>
                <ul className="mt-4 space-y-2">
                  {selected.checklistKo.map((item, i) => (
                    <li key={i}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/40">
                        <input
                          type="checkbox"
                          checked={!!checked[i]}
                          onChange={(e) =>
                            setChecked((prev) => ({ ...prev, [i]: e.target.checked }))
                          }
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                        />
                        <span className="text-sm leading-relaxed">{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs tabular-nums text-zinc-500">
                  {Object.values(checked).filter(Boolean).length} / {selected.checklistKo.length}{" "}
                  항목 충족
                </p>
              </section>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={persist}
                  disabled={saved}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saved ? "작문 기록에 저장됨" : "작문 기록에 저장"}
                </button>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setRunning(true);
                  }}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium dark:border-zinc-700"
                >
                  더 고치기
                </button>
              </div>

              <p className="mt-4 flex items-start gap-2 rounded-xl bg-zinc-100 p-3.5 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                기술은 지금은 자가 채점이다. 나중에 AI 채점을 붙이면 위 체크리스트가 그대로 채점
                기준으로 넘어가도록 데이터를 만들어 뒀다.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

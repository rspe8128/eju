"use client";

import { useState } from "react";
import { Save, Wand2, X } from "lucide-react";
import type { AnswerKey } from "@/lib/types";
import { defaultChoiceCount, getTopics, UNTAGGED } from "@/lib/examTopics";
import { cn } from "@/lib/utils";

/**
 * 정답표 등록 화면.
 *
 * JASSO 정답 PDF는 텍스트 레이어가 없는 스캔 이미지라 자동 추출이 불가능하다.
 * 회차·과목당 딱 한 번만 손으로 옮겨두면 이후 응시할 때마다 자동 채점된다.
 */
export function AnswerKeyEditor({
  paperId,
  subjectCode,
  existing,
  answerPdf,
  onSave,
  onCancel,
}: {
  paperId: string;
  subjectCode: string;
  existing?: AnswerKey;
  answerPdf?: string;
  onSave: (key: AnswerKey) => void;
  onCancel: () => void;
}) {
  const choices = defaultChoiceCount(subjectCode);
  const topics = getTopics(subjectCode);

  const [count, setCount] = useState(existing?.answers.length ?? 20);
  const [answers, setAnswers] = useState<string[]>(
    existing?.answers ?? Array(20).fill("")
  );
  const [topicIds, setTopicIds] = useState<string[]>(
    existing?.topics ?? Array(20).fill(UNTAGGED)
  );
  const [bulk, setBulk] = useState("");
  const [showTopics, setShowTopics] = useState(false);

  const resize = (n: number) => {
    const size = Math.max(1, Math.min(120, n));
    setCount(size);
    setAnswers((prev) => Array.from({ length: size }, (_, i) => prev[i] ?? ""));
    setTopicIds((prev) => Array.from({ length: size }, (_, i) => prev[i] ?? UNTAGGED));
  };

  /** "3142", "3,1,4,2", "1:3 2:1" 세 가지 형식을 모두 받아준다. */
  const applyBulk = () => {
    const raw = bulk.trim();
    if (!raw) return;

    const pairs = [...raw.matchAll(/(\d+)\s*[:.]\s*(\d+)/g)];
    if (pairs.length > 0) {
      const next = [...answers];
      let maxQ = count;
      for (const [, q, a] of pairs) {
        const idx = Number(q) - 1;
        if (idx < 0) continue;
        while (next.length <= idx) next.push("");
        next[idx] = a;
        maxQ = Math.max(maxQ, idx + 1);
      }
      setCount(maxQ);
      setAnswers(Array.from({ length: maxQ }, (_, i) => next[i] ?? ""));
      setTopicIds((prev) => Array.from({ length: maxQ }, (_, i) => prev[i] ?? UNTAGGED));
      setBulk("");
      return;
    }

    const tokens = raw.includes(",") || /\s/.test(raw)
      ? raw.split(/[,\s]+/).filter(Boolean)
      : raw.split("");
    const size = tokens.length;
    setCount(size);
    setAnswers(tokens.map((t) => t.replace(/\D/g, "")));
    setTopicIds((prev) => Array.from({ length: size }, (_, i) => prev[i] ?? UNTAGGED));
    setBulk("");
  };

  const filled = answers.filter((a) => a !== "").length;

  const save = () => {
    onSave({
      id: `${paperId}:${subjectCode}`,
      paperId,
      subjectCode,
      answers: answers.slice(0, count),
      topics: topicIds.slice(0, count),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">정답표 등록</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {paperId} · {subjectCode}
          </p>
        </div>
        <button onClick={onCancel} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
        <p className="font-medium">JASSO 공식 정답 PDF에서 옮겨 적는 화면이다.</p>
        <p className="mt-1 text-xs leading-relaxed">
          2018년 1회는 앱에 기본 정답표가 들어 있다. 일본어는 저작권상 일부 문항만 공개되어 빈칸은
          채점에서 제외된다. 다른 회차는 아래 PDF를 보고 한 번만 입력하면 된다.
        </p>
        {answerPdf && (
          <a
            href={answerPdf}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >
            공식 정답 PDF 열기 ↗
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">문항 수</span>
          <input
            type="number"
            min={1}
            max={120}
            value={count}
            onChange={(e) => resize(parseInt(e.target.value) || 1)}
            className="w-24 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-zinc-500">
            한 번에 붙여넣기 — <code className="text-xs">3142…</code> 또는{" "}
            <code className="text-xs">3,1,4,2</code> 또는 <code className="text-xs">1:3 2:1</code>
          </span>
          <div className="flex gap-2">
            <input
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyBulk()}
              placeholder="정답을 순서대로 입력"
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 font-mono dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              onClick={applyBulk}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
            >
              <Wand2 className="h-4 w-4" />
              적용
            </button>
          </div>
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {filled} / {count} 문항 입력됨
          </p>
          <button
            onClick={() => setShowTopics((s) => !s)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showTopics ? "단원 태그 숨기기" : "단원 태그 지정하기"}
          </button>
        </div>

        <div
          className={cn(
            "grid gap-2",
            showTopics
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-4 sm:grid-cols-6 lg:grid-cols-10"
          )}
        >
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border border-zinc-200 p-2 dark:border-zinc-700",
                showTopics && "flex items-center gap-2"
              )}
            >
              <div className="flex items-center gap-1">
                <span className="w-6 shrink-0 text-right text-xs text-zinc-400">{i + 1}</span>
                <input
                  value={answers[i] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(-1);
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[i] = v;
                      return next;
                    });
                  }}
                  inputMode="numeric"
                  placeholder="–"
                  className="w-full min-w-0 rounded border border-zinc-200 bg-white px-1.5 py-1 text-center font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
                />
              </div>
              {showTopics && (
                <select
                  value={topicIds[i] ?? UNTAGGED}
                  onChange={(e) =>
                    setTopicIds((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  className="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-1 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                >
                  <option value={UNTAGGED}>미분류</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          선택지는 {choices === 10 ? "0~9 (수학 마크시트)" : `1~${choices}`} 기준이다.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={filled === 0}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          정답표 저장
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm dark:border-zinc-700"
        >
          취소
        </button>
      </div>
    </div>
  );
}

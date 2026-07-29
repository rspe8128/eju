"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import type { ConceptItem, Item, ProblemItem } from "@/lib/types";

type Props = {
  subjectId: string;
};

function MarkdownPreview({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-1">
      {markdown.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="mt-4 text-base font-bold">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h4 key={i} className="mt-3 text-sm font-semibold">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <li key={i} className="ml-4 list-disc text-sm text-zinc-600 dark:text-zinc-400">
              {line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}
            </li>
          );
        }
        if (line.trim()) {
          return (
            <p key={i} className="text-sm text-zinc-600 dark:text-zinc-400">
              {line}
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}

export function SubjectDetailView({ subjectId }: Props) {
  const { data, markProblemSolved, updateItem } = useStorage();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState<"correct" | "wrong" | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMarkdown, setEditMarkdown] = useState("");
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editExplanation, setEditExplanation] = useState("");

  const subject = data.subjects.find((s) => s.id === subjectId);
  const units = data.units
    .filter((u) => u.subjectId === subjectId)
    .sort((a, b) => a.order - b.order);

  if (!subject) {
    return (
      <div className="py-20 text-center">
        <p className="mb-2 text-zinc-500">과목을 찾을 수 없습니다.</p>
        <Link href="/study/subjects" className="text-sm text-blue-600 hover:underline">
          목록으로
        </Link>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/study/subjects" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← 교과목 목록
          </Link>
          <h1 className="mt-2 text-2xl font-bold" style={{ color: subject.color }}>
            {subject.name}
          </h1>
        </div>
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="font-medium">보관함에서 학습 모듈을 담으세요</p>
          <p className="mt-1.5 text-sm text-zinc-500">
            이 과목에 담긴 단원이 아직 없다. 모듈을 추가하면 개념과 문제가 여기에 표시된다.
          </p>
          <Link
            href="/study/modules"
            className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            학습 모듈 보관함 열기
          </Link>
        </div>
      </div>
    );
  }

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setShowAnswer(false);
    setUserAnswer(null);
    setEditing(false);
  };

  const startEdit = () => {
    if (!selectedItem) return;
    setEditTitle(selectedItem.title);
    if (selectedItem.type === "concept") {
      setEditMarkdown(selectedItem.markdown);
    } else {
      setEditQuestion(selectedItem.question);
      setEditAnswer(selectedItem.answer);
      setEditExplanation(selectedItem.explanation ?? "");
    }
    setEditing(true);
  };

  const saveEdit = () => {
    if (!selectedItem) return;
    if (selectedItem.type === "concept") {
      const next: ConceptItem = {
        ...selectedItem,
        title: editTitle,
        markdown: editMarkdown,
      };
      updateItem(next);
      setSelectedItem(next);
    } else {
      const next: ProblemItem = {
        ...selectedItem,
        title: editTitle,
        question: editQuestion,
        answer: editAnswer,
        explanation: editExplanation || undefined,
      };
      updateItem(next);
      setSelectedItem(next);
    }
    setEditing(false);
  };

  // ── 단원·항목 목록 ──────────────────────────────────────
  // 항목을 고르면 목록을 접고 내용 화면으로 넘어간다.
  if (!selectedItem) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/study/subjects" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← 교과목 목록
          </Link>
          <h1 className="mt-2 text-2xl font-bold" style={{ color: subject.color }}>
            {subject.name}
          </h1>
        </div>

        <div className="space-y-4">
          {units.map((unit) => {
            const items = data.items.filter((i) => i.unitId === unit.id);
            return (
              <div key={unit.id} className="rounded-xl border border-zinc-200 dark:border-zinc-700">
                <div className="border-b border-zinc-200 px-4 py-3 font-medium dark:border-zinc-700">
                  {unit.title}
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            item.type === "concept"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                        >
                          {item.type === "concept" ? "개념" : "문제"}
                        </span>
                        {item.title}
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 고른 항목의 내용 화면 ────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => setSelectedItem(null)}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          {subject.name} 단원 목록
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{selectedItem.title}</h2>
          <button
            onClick={startEdit}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-blue-600"
            aria-label="편집"
          >
            <Pencil className="h-4 w-4" />
            편집
          </button>
        </div>

        {editing ? (
          <div className="space-y-3">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="제목"
            />
            {selectedItem.type === "concept" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <textarea
                  value={editMarkdown}
                  onChange={(e) => setEditMarkdown(e.target.value)}
                  rows={12}
                  className="rounded-lg border border-zinc-200 p-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-800"
                />
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                  <p className="mb-2 text-xs text-zinc-400">미리보기</p>
                  <MarkdownPreview markdown={editMarkdown} />
                </div>
              </div>
            ) : (
              <>
                <textarea
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  rows={3}
                  placeholder="문제"
                  className="w-full rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                <input
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  placeholder="정답"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                <textarea
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  rows={3}
                  placeholder="해설 (선택)"
                  className="w-full rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </>
            )}
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
              >
                저장
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-500"
              >
                취소
              </button>
            </div>
          </div>
        ) : selectedItem.type === "concept" ? (
          <MarkdownPreview markdown={selectedItem.markdown} />
        ) : (
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectedItem.question}</p>
            {showAnswer ? (
              <div className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  정답: {selectedItem.answer}
                </p>
                {selectedItem.explanation && (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    해설: {selectedItem.explanation}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                정답 보기
              </button>
            )}

            {showAnswer && !userAnswer && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    setUserAnswer("correct");
                    markProblemSolved(selectedItem.id, true);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  <Check className="h-4 w-4" />
                  맞았어요
                </button>
                <button
                  onClick={() => {
                    setUserAnswer("wrong");
                    markProblemSolved(selectedItem.id, false);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
                >
                  <X className="h-4 w-4" />
                  틀렸어요
                </button>
              </div>
            )}

            {userAnswer && (
              <p className="mt-4 text-sm text-zinc-500">
                {userAnswer === "correct"
                  ? "정답으로 기록했습니다."
                  : "오답노트에 추가했습니다."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

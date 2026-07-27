"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  SkipForward,
  ExternalLink,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  Send,
} from "lucide-react";
import { formatClock, getMockPlan, type MockPhase } from "@/lib/mockExam";
import { defaultChoiceCount, MATH_SIGN } from "@/lib/examTopics";
import { getSubjectLabel } from "@/lib/eju";
import type { AnswerKey } from "@/lib/types";
import type { PastPaper, PaperSubjectKey } from "@/lib/data/ejuPastPapers";
import { cn } from "@/lib/utils";
import { TranslatePanel } from "./TranslatePanel";

/** 과목 코드 → 타이머 계획. 이과 단일 과목은 40분. */
function phasesFor(subjectCode: string): { phases: MockPhase[]; total: number } {
  if (["physics", "chemistry", "biology"].includes(subjectCode)) {
    return {
      phases: [
        {
          id: "main",
          label: getSubjectLabel(subjectCode),
          minutes: 40,
          hint: "이과는 2과목 80분 — 한 과목당 40분이 실전 배분이다.",
        },
      ],
      total: 40,
    };
  }
  const plan = getMockPlan(subjectCode);
  if (plan) return { phases: plan.phases, total: plan.totalMinutes };
  return {
    phases: [{ id: "main", label: getSubjectLabel(subjectCode), minutes: 80, hint: "" }],
    total: 80,
  };
}

export function ExamRunner({
  paper,
  paperKey,
  subjectCode,
  answerKey,
  onSubmit,
  onExit,
}: {
  paper: PastPaper;
  paperKey: PaperSubjectKey;
  subjectCode: string;
  answerKey?: AnswerKey;
  onSubmit: (responses: string[], minutes: number) => void;
  onExit: () => void;
}) {
  const { phases, total } = useMemo(() => phasesFor(subjectCode), [subjectCode]);
  const choices = defaultChoiceCount(subjectCode);
  const isMath = subjectCode === "math1" || subjectCode === "math2";

  const questionCount = answerKey?.answers.length ?? 20;
  const [responses, setResponses] = useState<string[]>(() =>
    Array(questionCount).fill("")
  );

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(phases[0].minutes * 60);
  const [running, setRunning] = useState(true);
  const [showPdf, setShowPdf] = useState(true);
  const [showTranslate, setShowTranslate] = useState(false);
  const startedAt = useRef(Date.now());

  const phase = phases[phaseIndex];

  const pdfUrl = paper.pdfs[paperKey]?.ja;

  const nextPhase = useCallback(() => {
    const next = phaseIndex + 1;
    if (next >= phases.length) {
      setRunning(false);
      setSecondsLeft(0);
      return;
    }
    setPhaseIndex(next);
    setSecondsLeft(phases[next].minutes * 60);
  }, [phaseIndex, phases]);

  // 카운트다운만 담당 — 상태 갱신 함수 안에서 다른 상태를 건드리지 않는다.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // 0초에 닿으면 다음 영역으로 넘긴다.
  useEffect(() => {
    if (running && secondsLeft === 0) nextPhase();
  }, [running, secondsLeft, nextPhase]);

  const pick = (qIndex: number, value: string) => {
    setResponses((prev) => {
      const next = [...prev];
      next[qIndex] = next[qIndex] === value ? "" : value;
      return next;
    });
  };

  const answered = responses.filter((r) => r !== "").length;
  const isLastMinute = secondsLeft <= 60;

  const submit = () => {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60_000));
    onSubmit(responses, minutes);
  };

  return (
    <div className="space-y-4">
      {/* 상단 바 — 타이머 */}
      <div className="sticky top-14 z-20 rounded-2xl border border-zinc-200 bg-white/95 p-4 backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-zinc-500">
              {paper.label} · {getSubjectLabel(subjectCode)}
            </p>
            <p className="text-sm font-semibold">{phase.label}</p>
          </div>

          <p
            className={cn(
              "font-mono text-4xl font-bold tabular-nums",
              isLastMinute ? "text-red-500" : "text-zinc-900 dark:text-white"
            )}
          >
            {formatClock(secondsLeft)}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "일시정지" : "계속"}
            </button>
            {phases.length > 1 && (
              <button
                onClick={nextPhase}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600"
              >
                <SkipForward className="h-4 w-4" />
                다음
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isLastMinute ? "bg-red-500" : "bg-blue-500"
            )}
            style={{
              width: `${Math.min(100, (1 - secondsLeft / (phase.minutes * 60)) * 100)}%`,
            }}
          />
        </div>
        {phase.hint && <p className="mt-2 text-xs text-zinc-500">{phase.hint}</p>}
      </div>

      {/* 도구 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={pdfUrl ?? paper.sessionUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
        >
          <ExternalLink className="h-4 w-4" />
          {pdfUrl ? "문제 PDF 새 창" : "JASSO 회차 페이지"}
        </a>
        {pdfUrl && (
          <button
            onClick={() => setShowPdf((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
          >
            <FileText className="h-4 w-4" />
            {showPdf ? "PDF 숨기기" : "PDF 보기"}
          </button>
        )}
        <button
          onClick={() => setShowTranslate((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
        >
          {showTranslate ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
          번역 패널
        </button>
        <button onClick={onExit} className="ml-auto text-sm text-zinc-500 hover:text-red-500">
          나가기
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* PDF */}
        {showPdf && pdfUrl && (
          <div className="lg:col-span-3">
            <iframe
              src={pdfUrl}
              title="EJU 기출 문제"
              className="h-[70vh] w-full rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700"
            />
            <p className="mt-2 text-xs text-zinc-400">
              PDF가 비어 보이면 JASSO가 프레임 삽입을 막은 것이다. 위의 “문제 PDF 새 창”으로 열어
              옆에 띄워놓고 풀면 된다.
            </p>
          </div>
        )}

        {/* 답안지 */}
        <div className={cn(showPdf && pdfUrl ? "lg:col-span-2" : "lg:col-span-5")}>
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">답안지</h3>
              <span className="text-xs text-zinc-500">
                {answered} / {questionCount}
              </span>
            </div>

            <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
              {Array.from({ length: questionCount }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-right text-xs text-zinc-400">{i + 1}</span>
                  <div className="flex flex-wrap gap-1">
                    {isMath && (
                      <button
                        onClick={() => pick(i, MATH_SIGN)}
                        className={cn(
                          "h-7 min-w-7 rounded-full border px-1.5 text-xs font-medium transition-colors",
                          responses[i] === MATH_SIGN
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-zinc-300 text-zinc-500 hover:border-blue-400 dark:border-zinc-600"
                        )}
                        title="부호 −"
                      >
                        −
                      </button>
                    )}
                    {Array.from({ length: choices }, (_, c) => {
                      const value = String(choices === 10 ? c : c + 1);
                      const active = responses[i] === value;
                      return (
                        <button
                          key={value}
                          onClick={() => pick(i, value)}
                          className={cn(
                            "h-7 w-7 rounded-full border text-xs font-medium transition-colors",
                            active
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-zinc-300 text-zinc-500 hover:border-blue-400 dark:border-zinc-600"
                          )}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={submit}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <Send className="h-4 w-4" />
              제출하고 채점
            </button>
            {!answerKey && (
              <p className="mt-2 text-center text-xs text-amber-600">
                정답표가 없어 자동 채점은 안 된다. 제출 후 정답표를 등록하면 채점된다.
              </p>
            )}
          </div>

          {showTranslate && (
            <div className="mt-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
              <TranslatePanel compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

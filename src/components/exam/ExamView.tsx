"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  KeyRound,
  Play,
  CheckCircle2,
  AlertTriangle,
  Languages,
  BarChart3,
} from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import {
  PAST_PAPERS,
  PAPER_SUBJECT_META,
  getPaper,
  isAvailable,
  type PaperSubjectKey,
} from "@/lib/data/ejuPastPapers";
import { getSubjectLabel } from "@/lib/eju";
import type { AnswerKey, ExamAttempt } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnswerKeyEditor } from "./AnswerKeyEditor";
import { ExamRunner } from "./ExamRunner";
import { ExamResult } from "./ExamResult";
import { TranslatePanel } from "./TranslatePanel";

type Mode =
  | { kind: "select" }
  | { kind: "key"; paperId: string; subjectCode: string }
  | { kind: "run"; paperId: string; subjectCode: string }
  | { kind: "result"; paperId: string; subjectCode: string; responses: string[]; minutes: number };

/** 사용자가 지정한 우선순위: 일본어 → 수학 → 종합 → 이과 */
const SUBJECT_TABS: { key: PaperSubjectKey; codes: string[] }[] = [
  { key: "jafl", codes: ["japanese"] },
  { key: "math", codes: ["math1", "math2"] },
  { key: "jw", codes: ["sogo"] },
  { key: "science", codes: ["physics", "chemistry", "biology"] },
];

export function ExamView() {
  const { data, saveAnswerKey, addExamAttempt } = useStorage();
  const [mode, setMode] = useState<Mode>({ kind: "select" });
  const [tab, setTab] = useState<PaperSubjectKey>("jafl");
  const [code, setCode] = useState<string>("japanese");
  const [showTranslate, setShowTranslate] = useState(false);

  const keyFor = (paperId: string, subjectCode: string): AnswerKey | undefined =>
    data.answerKeys.find((k) => k.id === `${paperId}:${subjectCode}`);

  const attemptsFor = (paperId: string, subjectCode: string): ExamAttempt[] =>
    data.examAttempts.filter((a) => a.paperId === paperId && a.subjectCode === subjectCode);

  const papers = useMemo(
    () => PAST_PAPERS.filter((p) => isAvailable(p, tab)),
    [tab]
  );
  const hiddenCount = PAST_PAPERS.length - papers.length;

  // ── 정답표 등록 ────────────────────────────────
  if (mode.kind === "key") {
    const paper = getPaper(mode.paperId);
    if (!paper) return null;
    return (
      <AnswerKeyEditor
        paperId={mode.paperId}
        subjectCode={mode.subjectCode}
        existing={keyFor(mode.paperId, mode.subjectCode)}
        answerPdf={paper.answerPdf}
        onSave={(k) => {
          saveAnswerKey(k);
          setMode({ kind: "select" });
        }}
        onCancel={() => setMode({ kind: "select" })}
      />
    );
  }

  // ── 응시 중 ────────────────────────────────────
  if (mode.kind === "run") {
    const paper = getPaper(mode.paperId);
    if (!paper) return null;
    return (
      <ExamRunner
        paper={paper}
        paperKey={tab}
        subjectCode={mode.subjectCode}
        answerKey={keyFor(mode.paperId, mode.subjectCode)}
        onSubmit={(responses, minutes) =>
          setMode({
            kind: "result",
            paperId: mode.paperId,
            subjectCode: mode.subjectCode,
            responses,
            minutes,
          })
        }
        onExit={() => setMode({ kind: "select" })}
      />
    );
  }

  // ── 채점 결과 ──────────────────────────────────
  if (mode.kind === "result") {
    const paper = getPaper(mode.paperId);
    const answerKey = keyFor(mode.paperId, mode.subjectCode);
    if (!paper) return null;

    if (!answerKey) {
      return (
        <div className="mx-auto max-w-md py-16 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-lg font-bold">정답표가 없어 채점을 못 했다</h2>
          <p className="mt-2 text-sm text-zinc-500">
            이 회차 정답표를 등록하면 방금 답안이 채점된다.
          </p>
          <button
            onClick={() =>
              setMode({ kind: "key", paperId: mode.paperId, subjectCode: mode.subjectCode })
            }
            className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            정답표 등록하기
          </button>
        </div>
      );
    }

    return (
      <ExamResult
        paper={paper}
        subjectCode={mode.subjectCode}
        answerKey={answerKey}
        responses={mode.responses}
        minutes={mode.minutes}
        onSave={(attempt, updatedKey) => {
          saveAnswerKey(updatedKey);
          addExamAttempt(attempt);
          setMode({ kind: "select" });
        }}
        onRetry={() =>
          setMode({ kind: "run", paperId: mode.paperId, subjectCode: mode.subjectCode })
        }
        onExit={() => setMode({ kind: "select" })}
      />
    );
  }

  // ── 회차 선택 ──────────────────────────────────
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">기출 풀이</h1>
        <p className="mt-1 text-sm text-zinc-500">
          JASSO 공식 기출을 실전 시간표로 풀고, 채점 결과를 약점 분석에 넘긴다.
        </p>
      </header>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-900/20">
        <p className="font-medium text-amber-900 dark:text-amber-200">
          문제 원문은 JASSO 공식 PDF를 그대로 띄운다
        </p>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          <li>
            · 일본어 과목 공개본은 <strong>독해 지문이 삭제돼 있다</strong>. 지문 원저자가 웹
            게재를 허락하지 않아 JASSO가 직접 뺀 것이라, 어디서도 구할 수 없다.
          </li>
          <li>
            · 수학·이과·종합과목 PDF는 스캔본이라 텍스트 추출이 안 된다. 대신 도표·그래프가 원본
            그대로 보이므로 실전과 동일하다.
          </li>
          <li>
            · JASSO 저작권 고지상 기출의 웹 재배포·번안은 금지되어 있다. 그래서 이 앱은 원문을
            복제하지 않고 원본을 열어서 읽는 방식이다.
          </li>
        </ul>
      </div>

      {/* 과목 탭 */}
      <div className="flex flex-wrap gap-2">
        {SUBJECT_TABS.map(({ key, codes }) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setCode(codes[0]);
            }}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              tab === key
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-zinc-200 text-zinc-600 hover:border-blue-300 dark:border-zinc-700 dark:text-zinc-400"
            )}
          >
            {PAPER_SUBJECT_META[key].label}
          </button>
        ))}
      </div>

      {/* 세부 과목 선택 */}
      {PAPER_SUBJECT_META[tab].codes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {PAPER_SUBJECT_META[tab].codes.map((c) => (
            <button
              key={c}
              onClick={() => setCode(c)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs",
                code === c
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
              )}
            >
              {getSubjectLabel(c)}
            </button>
          ))}
        </div>
      )}

      {hiddenCount > 0 && (
        <p className="text-xs text-zinc-400">
          {hiddenCount}개 회차는 JASSO가 이 과목을 아직 공개하지 않아 목록에서 빠져 있다.
        </p>
      )}

      {/* 회차 목록 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {papers.map((paper) => {
          const key = keyFor(paper.id, code);
          const attempts = attemptsFor(paper.id, code);
          const best = attempts.length
            ? Math.max(...attempts.map((a) => Math.round((a.correctCount / a.totalCount) * 100)))
            : null;
          const pdf = paper.pdfs[tab]?.ja;

          return (
            <div
              key={paper.id}
              className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{paper.label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {getSubjectLabel(code)}
                    {key && ` · 정답표 ${key.answers.filter(Boolean).length}문항`}
                  </p>
                </div>
                {best !== null && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      best >= 80
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : best >= 60
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    )}
                  >
                    최고 {best}%
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setMode({ kind: "run", paperId: paper.id, subjectCode: code })}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  <Play className="h-3.5 w-3.5" />
                  풀기
                </button>
                <button
                  onClick={() => setMode({ kind: "key", paperId: paper.id, subjectCode: code })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs",
                    key
                      ? "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                      : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                  )}
                >
                  {key ? <CheckCircle2 className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
                  {key ? "정답표 수정" : "정답표 등록"}
                </button>
                <a
                  href={pdf ?? paper.sessionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {pdf ? "PDF" : "JASSO"}
                </a>
              </div>

              {attempts.length > 0 && (
                <p className="mt-2 text-xs text-zinc-400">응시 {attempts.length}회</p>
              )}
            </div>
          );
        })}
      </div>

      {/* 번역 도구 */}
      <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
        <button
          onClick={() => setShowTranslate((s) => !s)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Languages className="h-4 w-4 text-blue-500" />
            지문 번역기
          </span>
          <span className="text-xs text-zinc-400">{showTranslate ? "접기" : "펼치기"}</span>
        </button>
        {showTranslate && (
          <div className="mt-4">
            <TranslatePanel />
          </div>
        )}
      </section>

      <Link
        href="/stats"
        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
      >
        <BarChart3 className="h-4 w-4" />
        약점 분석에서 단원별 정답률 보기
      </Link>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Languages,
  Lock,
  PenLine,
  PlayCircle,
  Headphones,
  History,
  Database,
  Trash2,
} from "lucide-react";
import type { MockPaper, MockSection } from "@/lib/mock/types";
import { paperQuestionCount, paperTotalMinutes } from "@/lib/mock/types";
import { MOCK_PAPERS, isSectionReady, papersBySubject } from "@/lib/mock/registry";
import { loadPaperProgress } from "@/lib/mock/progress";
import { cachedCount, clearTranslationCache } from "@/lib/mock/translation";
import { useStorage } from "@/context/StorageContext";
import { MockRunner } from "./MockRunner";
import { WritingRunner } from "./WritingRunner";
import { cn } from "@/lib/utils";

const SECTION_ICON: Record<string, typeof BookOpen> = {
  writing: PenLine,
  reading: BookOpen,
  "listening-chart": Headphones,
  listening: Headphones,
  problems: FileText,
};

const LEVEL_STYLE: Record<string, string> = {
  입문: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  표준: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  실전: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function MockExamView() {
  const { data } = useStorage();
  const [paperId, setPaperId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, { answers: Record<string, string> }>>({});
  const [cached, setCached] = useState(0);

  const paper = MOCK_PAPERS.find((p) => p.id === paperId) ?? null;
  const section = paper?.sections.find((s) => s.id === sectionId) ?? null;

  useEffect(() => {
    setCached(cachedCount());
  }, [paperId, sectionId]);

  useEffect(() => {
    if (paperId) setProgress(loadPaperProgress(paperId));
  }, [paperId, sectionId]);

  const attemptsByKey = useMemo(() => {
    const map = new Map<string, { correct: number; total: number; date: string }[]>();
    for (const a of data.examAttempts) {
      const list = map.get(a.paperId) ?? [];
      list.push({ correct: a.correctCount, total: a.totalCount, date: a.date });
      map.set(a.paperId, list);
    }
    for (const list of map.values()) list.sort((x, y) => y.date.localeCompare(x.date));
    return map;
  }, [data.examAttempts]);

  // ── 실제 풀이 화면 ────────────────────────────────────────
  if (paper && section) {
    const back = () => setSectionId(null);
    // key를 붙여서 회차·세션이 바뀌면 반드시 새 인스턴스로 마운트되게 한다.
    // (같은 컴포넌트가 재사용되면 이전 세션의 답안·타이머가 남는다)
    const key = `${paper.id}:${section.id}`;
    if (section.kind === "writing") {
      return <WritingRunner key={key} paper={paper} section={section} onExit={back} />;
    }
    return <MockRunner key={key} paper={paper} section={section} onExit={back} />;
  }

  // ── 세션 목록 ────────────────────────────────────────────
  if (paper) {
    return (
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => setPaperId(null)}
          className="mb-4 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          회차 목록
        </button>

        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{paper.title}</h1>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                LEVEL_STYLE[paper.level] ?? LEVEL_STYLE["표준"]
              )}
            >
              {paper.level}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{paper.description}</p>
        </header>

        <p className="mb-4 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          실전 순서는 기술 → 독해 → 청독해·청해다. 세션은 따로 풀 수 있지만, 한 번쯤은 쉬지 않고
          이어서 풀어 보자. 실전에서 무너지는 건 실력이 아니라 집중력이다.
        </p>

        <ul className="space-y-3">
          {paper.sections.map((s) => {
            const Icon = SECTION_ICON[s.kind] ?? BookOpen;
            const ready = isSectionReady(s);
            const attempts = attemptsByKey.get(`${paper.id}:${s.id}`) ?? [];
            const best = attempts.reduce(
              (acc, a) => (a.total > 0 && a.correct / a.total > acc ? a.correct / a.total : acc),
              0
            );
            const inProgress = progress[s.id]
              ? Object.keys(progress[s.id].answers ?? {}).length
              : 0;

            return (
              <li key={s.id}>
                <button
                  disabled={!ready}
                  onClick={() => setSectionId(s.id)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left transition-colors dark:bg-zinc-800",
                    ready
                      ? "border-zinc-200 hover:border-blue-400 dark:border-zinc-700"
                      : "cursor-not-allowed border-dashed border-zinc-200 opacity-60 dark:border-zinc-700"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      ready
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-700"
                    )}
                  >
                    {ready ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{s.label}</span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="h-3 w-3" />
                        {s.minutes}분
                      </span>
                      {ready && s.kind !== "writing" && (
                        <span className="text-xs text-zinc-500">{s.questions.length}문항</span>
                      )}
                      {ready && s.kind === "writing" && (
                        <span className="text-xs text-zinc-500">
                          {s.writingPrompts?.length ?? 0}주제 중 1개 선택
                        </span>
                      )}
                      {!ready && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-700">
                          준비 중
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                      {ready ? s.hintKo : "음성 문항은 아직 넣지 않았다. 독해·기술부터 하자."}
                    </span>
                    {ready && (attempts.length > 0 || inProgress > 0) && (
                      <span className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
                        {attempts.length > 0 && (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <History className="h-3 w-3" />
                            {attempts.length}회 응시 · 최고 {Math.round(best * 100)}%
                          </span>
                        )}
                        {inProgress > 0 && (
                          <span className="text-blue-600 dark:text-blue-400">
                            풀던 기록 {inProgress}문항 — 이어서 풀 수 있다
                          </span>
                        )}
                      </span>
                    )}
                  </span>

                  {ready && <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ── 회차 목록 ────────────────────────────────────────────
  const groups = papersBySubject();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">모의고사</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          한 문제씩 넘겨 가며 풀고, 제출하면 바로 채점·해설이 나온다. 지문·발문·선택지 모두
          한국어 번역을 눌러서 볼 수 있다.
        </p>
      </header>

      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white p-3.5 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
        <Languages className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div className="flex-1">
          <p>
            번역은 <b>누른 문장만</b> DeepL로 보내고, 한 번 번역한 문장은 저장해 두었다가 다시
            쓴다. 무료 한도(월 50만 자)를 아끼려는 것이므로, 편하게 눌러도 된다.
          </p>
          {cached > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-zinc-500">
              <Database className="h-3 w-3" />
              저장된 번역 {cached}문장
              <button
                onClick={() => {
                  clearTranslationCache();
                  setCached(0);
                }}
                className="ml-1 flex items-center gap-0.5 text-zinc-400 hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
                비우기
              </button>
            </p>
          )}
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.subjectCode} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {g.label}
          </h2>
          <ul className="space-y-3">
            {g.papers.map((p) => (
              <li key={p.id}>
                <PaperCard
                  paper={p}
                  attempts={
                    p.sections
                      .map((s) => attemptsByKey.get(`${p.id}:${s.id}`)?.length ?? 0)
                      .reduce((a, b) => a + b, 0)
                  }
                  onOpen={() => setPaperId(p.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="rounded-xl bg-zinc-100 p-4 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        <b>왜 기출이 아니라 자체 문항인가.</b> JASSO가 공개하는 일본어 기출 PDF는 저작권 문제로
        독해 지문이 통째로 삭제된 채 올라온다(「著作権上の都合により本問題のウェブ掲載はいたしません」).
        수학·이과 PDF는 텍스트 레이어 없는 스캔본이라 추출 자체가 안 된다. 게다가 기출의 번역·재배포는
        JASSO가 금지하고 있다. 그래서 출제 형식·난이도·문항 수를 맞춘 자체 문항으로 만들었다.
      </p>
    </div>
  );
}

function PaperCard({
  paper,
  attempts,
  onOpen,
}: {
  paper: MockPaper;
  attempts: number;
  onOpen: () => void;
}) {
  const ready = paper.sections.filter(isSectionReady);
  const questions = ready
    .filter((s: MockSection) => s.kind !== "writing")
    .reduce((n, s) => n + s.questions.length, 0);

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-blue-400 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-900/25">
        <PlayCircle className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{paper.title}</span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              LEVEL_STYLE[paper.level] ?? LEVEL_STYLE["표준"]
            )}
          >
            {paper.level}
          </span>
          {attempts > 0 && (
            <span className="text-[11px] text-green-600 dark:text-green-400">
              {attempts}회 응시
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
          {paper.description}
        </span>
        <span className="mt-2 flex flex-wrap gap-3 text-[11px] text-zinc-400">
          <span>세션 {ready.length}개</span>
          <span>객관식 {questions}문항</span>
          <span>
            총 {ready.reduce((n, s) => n + s.minutes, 0)}분 / 전체 설계 {paperTotalMinutes(paper)}분
          </span>
          <span>전체 {paperQuestionCount(paper)}문항 설계</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
    </button>
  );
}

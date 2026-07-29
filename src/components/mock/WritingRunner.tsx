"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, Pause, Play, Save, CheckCircle2, Sparkles } from "lucide-react";
import type { MockPaper, MockSection, MockWritingPrompt } from "@/lib/mock/types";
import { formatClock } from "@/lib/mockExam";
import { useTranslate } from "@/lib/mock/useTranslate";
import { loadWritingDraft, saveWritingDraft } from "@/lib/mock/progress";
import { useStorage } from "@/context/StorageContext";
import { todayString } from "@/lib/utils";
import { useOnline, OFFLINE_MESSAGE } from "@/lib/useOnline";
import { MIN_CHARS, MAX_CHARS } from "@/lib/writing/rubric";
import { GradeResultPanel } from "@/components/writing/GradeResultPanel";
import { WritingChecks, useWritingAnalysis } from "@/components/writing/WritingChecks";
import { useWritingGrade, gradeToEntryFields } from "@/components/writing/useWritingGrade";
import { TranslateButton, TranslateError } from "./TranslateButton";
import { cn } from "@/lib/utils";

function PromptCard({
  prompt,
  onSelect,
}: {
  prompt: MockWritingPrompt;
  onSelect: () => void;
}) {
  const tr = useTranslate([prompt.ja]);
  const online = useOnline();
  const translateBlocked = !online && !tr.cached && !tr.shown;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white transition-colors dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-700">
        <span className="text-sm font-semibold">テーマ {prompt.number}</span>
        <TranslateButton
          shown={tr.shown}
          loading={tr.loading}
          cached={tr.cached}
          onClick={tr.toggle}
          label="번역"
          disabled={translateBlocked}
          title={translateBlocked ? OFFLINE_MESSAGE : undefined}
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
          className="mt-3 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700"
        >
          이 주제로 쓰기
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

  const grader = useWritingGrade();
  // 글자 수·자동 점검은 /writing 과 완전히 같은 코드를 쓴다
  const { stats, checks, readyForGrading } = useWritingAnalysis(body);

  const selected = prompts.find((p) => p.id === selectedId) ?? null;
  const chars = stats.chars;

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
      // AI 채점을 받았으면 같이 남긴다 → /writing 의 과거 작성물에서도 보인다
      ...gradeToEntryFields(grader.grade),
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

  const inRange = chars >= MIN_CHARS && chars <= MAX_CHARS;

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

      {/* 주제를 고르기 전에는 주제 목록만, 고른 뒤에는 답안 화면만 보여준다.
          예전에는 주제 카드가 그대로 남고 그 아래에 답안란이 붙어서, 쓰는 내내
          위쪽에 안 쓰는 주제 카드가 자리를 차지했다. */}
      {!submitted && !selected && (
        <>
          <p className="ja-ui mb-4 rounded-xl border border-zinc-200 bg-white p-3.5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {section.instructionsJa}
          </p>
          <p className="mb-4 rounded-xl bg-blue-50 p-3.5 text-xs leading-relaxed text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            {section.hintKo}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            {prompts.map((p) => (
              <PromptCard key={p.id} prompt={p} onSelect={() => choose(p.id)} />
            ))}
          </div>
        </>
      )}

      {selected && (
        <div className="mt-6">
          <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">선택한 주제 · テーマ {selected.number}</p>
                <p className="ja-body mt-1 text-[15px]">{selected.ja}</p>
              </div>
              {!submitted && (
                <button
                  onClick={() => {
                    if (body.trim() && !confirm("쓴 내용은 그대로 두고 주제 목록으로 돌아갑니다.")) {
                      return;
                    }
                    setSelectedId(null);
                    setRunning(false);
                  }}
                  className="shrink-0 text-xs text-zinc-500 hover:text-blue-600"
                >
                  주제 바꾸기
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-700">
              <span className="text-sm font-semibold">답안</span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  inRange ? "text-green-600" : chars > MAX_CHARS ? "text-red-500" : "text-zinc-400"
                )}
              >
                {chars}자
                <span className="ml-1 text-xs font-normal text-zinc-400">
                  / {MIN_CHARS}~{MAX_CHARS}
                </span>
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
              <WritingChecks checks={checks} className="mt-5" />

              <section className="mt-4 rounded-2xl border border-violet-200 bg-white p-5 dark:border-violet-900/60 dark:bg-zinc-800">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  AI 채점
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  /writing 화면과 같은 채점 기준·같은 모델을 쓴다. 체크리스트 자가 채점과 나란히
                  보고, 어긋나는 항목이 있으면 그쪽을 먼저 파자.
                </p>
                <button
                  onClick={() => grader.runGrading(selected.ja, body)}
                  disabled={grader.grading || !body.trim() || grader.offline}
                  title={grader.blockedReason ?? undefined}
                  className="mt-3 flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
                >
                  {grader.grading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {grader.grading
                    ? "채점 중… (20초쯤 걸린다)"
                    : grader.grade
                      ? "다시 채점"
                      : "AI 채점 받기"}
                </button>
                {grader.offline && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    {OFFLINE_MESSAGE}
                  </p>
                )}
                {!readyForGrading && !grader.grade && !grader.grading && (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    위의 자동 점검에서 빨간 항목을 먼저 고치는 걸 권한다. 분량 미달이나 문체 혼용은
                    AI에게 묻지 않아도 감점이 확실하다.
                  </p>
                )}
                {grader.error && (
                  <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm leading-relaxed text-red-700 dark:bg-red-900/20 dark:text-red-300">
                    {grader.error}
                  </p>
                )}
              </section>

              {grader.grade && (
                <div className="mt-4">
                  <GradeResultPanel result={grader.grade} />
                </div>
              )}

              <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
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
                  {saved
                    ? "작문 기록에 저장됨"
                    : grader.grade
                      ? "채점 결과와 함께 저장"
                      : "작문 기록에 저장"}
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
                저장하면 작문 기록(/writing)에 남는다. AI 채점을 받은 뒤에 저장하면 점수와 첨삭까지
                같이 남으므로, 나중에 같은 주제를 다시 쓸 때 비교할 수 있다.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

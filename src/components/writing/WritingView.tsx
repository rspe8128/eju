"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Save,
  Sparkles,
  Loader2,
  AlertTriangle,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { writingPrompts } from "@/lib/data/writingPrompts";
import { todayString } from "@/lib/utils";
import { OFFLINE_MESSAGE } from "@/lib/useOnline";
import { MIN_CHARS, MAX_CHARS } from "@/lib/writing/rubric";
import { GradeResultPanel } from "./GradeResultPanel";
import { WritingChecks, useWritingAnalysis } from "./WritingChecks";
import { useWritingGrade, gradeToEntryFields } from "./useWritingGrade";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "eju.writing.draft.v1";

type Draft = { promptId: string; body: string; updatedAt: string };

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(d: Draft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* 초안 저장 실패는 조용히 넘어간다 */
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* noop */
  }
}

export function WritingView() {
  const { data, addWritingEntry, removeWritingEntry } = useStorage();

  const [promptId, setPromptId] = useState(writingPrompts[0].id);
  const [body, setBody] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [running, setRunning] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);

  const restored = useRef(false);
  const startedAt = useRef<number | null>(null);

  // 채점 호출과 자동 점검은 모의고사 기술 세션과 같은 코드를 쓴다
  const grader = useWritingGrade();
  const { grade, grading, error: gradeError } = grader;

  const prompt = writingPrompts.find((p) => p.id === promptId) ?? writingPrompts[0];
  const { stats, checks, readyForGrading } = useWritingAnalysis(body);
  const inRange = stats.chars >= MIN_CHARS && stats.chars <= MAX_CHARS;

  // ── 초안 복구 ────────────────────────────────────────────
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const d = loadDraft();
    if (d && d.body.trim()) {
      setBody(d.body);
      if (writingPrompts.some((p) => p.id === d.promptId)) setPromptId(d.promptId);
    }
  }, []);

  // ── 초안 자동 저장 ───────────────────────────────────────
  // 30분짜리 글을 새로고침 한 번에 날리지 않도록 타이핑할 때마다 남긴다.
  // 예전에는 저장 버튼이 본문을 비워 버려서, 저장을 깜빡하면 그대로 사라졌다.
  useEffect(() => {
    if (!restored.current || !body.trim()) return;
    saveDraft({ promptId, body, updatedAt: new Date().toISOString() });
  }, [body, promptId]);

  // ── 타이머 ───────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (secondsLeft === 0 && running) {
      setRunning(false);
      setTimeUp(true);
    }
  }, [secondsLeft, running]);

  const start = () => {
    if (!running && startedAt.current === null) startedAt.current = Date.now();
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    setTimeUp(false);
    setSecondsLeft(minutes * 60);
    startedAt.current = null;
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const runGrading = () => grader.runGrading(prompt.prompt, body);

  const handleSave = () => {
    if (!body.trim()) return;
    const spent = startedAt.current
      ? Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))
      : Math.max(1, minutes - Math.floor(secondsLeft / 60));
    addWritingEntry({
      date: todayString(),
      prompt: prompt.prompt,
      body,
      charCount: stats.chars,
      minutes: spent,
      ...gradeToEntryFields(grade),
    });
    clearDraft();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const startNew = () => {
    setBody("");
    grader.reset();
    clearDraft();
    reset();
  };

  // ── 지난 작성물 보기 ─────────────────────────────────────
  const viewing = data.writingEntries.find((e) => e.id === viewId);
  if (viewing) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button
          onClick={() => setViewId(null)}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          목록
        </button>
        <p className="text-sm text-zinc-500">
          {viewing.date} · {viewing.charCount}자 · {viewing.minutes}분
          {viewing.aiScore !== undefined && (
            <span className="ml-2 font-medium text-violet-600 dark:text-violet-400">
              AI {viewing.aiScore}/{viewing.aiMax ?? 50}점
            </span>
          )}
        </p>
        <p className="ja-body rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800">
          {viewing.prompt}
        </p>
        <div className="ja-body whitespace-pre-wrap rounded-xl border border-zinc-200 p-6 text-[15px] dark:border-zinc-700">
          {viewing.body}
        </div>

        {viewing.aiAxes && viewing.aiAxes.length > 0 && (
          <GradeResultPanel
            result={{
              total: viewing.aiScore ?? 0,
              max: viewing.aiMax ?? 50,
              axes: viewing.aiAxes.map((a, i) => ({ key: String(i), ...a })),
              strengths: viewing.aiStrengths ?? [],
              improvements: viewing.aiImprovements ?? [],
              fixes: viewing.aiFixes ?? [],
              advice: viewing.aiAdvice ?? "",
              model: viewing.aiModel ?? "",
            }}
          />
        )}
      </div>
    );
  }

  const failCount = checks.filter((c) => c.level === "fail").length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">記述 (작문) 연습</h1>
        <p className="mt-1 text-sm text-zinc-500">
          EJU 형식 · {MIN_CHARS}~{MAX_CHARS}자 · 30분 · である체
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={promptId}
          onChange={(e) => setPromptId(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
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
          className="w-16 rounded-xl border border-zinc-200 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        <span
          className={cn(
            "font-mono text-lg font-bold tabular-nums",
            timeUp ? "text-red-500" : secondsLeft <= 300 ? "text-amber-500" : ""
          )}
        >
          {mm}:{ss}
        </span>
        <button
          onClick={start}
          className="flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "일시정지" : "시작"}
        </button>
        <button
          onClick={reset}
          className="rounded-xl border border-zinc-200 p-2 text-zinc-500 dark:border-zinc-700"
          aria-label="타이머 초기화"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {timeUp && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            시간이 끝났다. 실전이라면 여기까지가 답안이다. 지금 몇 자였는지 기억해 두고, 계속 써서
            완성한 뒤 채점을 받아 보자.
          </span>
        </p>
      )}

      <div className="ja-body rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-[15px] dark:border-zinc-700 dark:bg-zinc-800/50">
        {prompt.prompt}
      </div>

      <div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          placeholder="ここに書く。「である体」で統一すること。"
          className="ja-body w-full rounded-xl border border-zinc-200 p-4 text-[15px] dark:border-zinc-700 dark:bg-zinc-800"
        />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span
            className={cn(
              "font-medium tabular-nums",
              inRange ? "text-green-600" : stats.chars > MAX_CHARS ? "text-red-500" : "text-zinc-500"
            )}
          >
            {stats.chars}자
            <span className="ml-1 font-normal text-zinc-400">
              / {MIN_CHARS}~{MAX_CHARS} (공백 제외)
            </span>
          </span>
          <span className="text-zinc-400">
            {stats.paragraphs}단락 · {stats.sentences}문장 · 초안 자동 저장됨
          </span>
        </div>
      </div>

      {body.trim().length > 0 && <WritingChecks checks={checks} />}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={runGrading}
          disabled={grading || !body.trim() || grader.offline}
          title={grader.blockedReason ?? undefined}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
        >
          {grading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {grading ? "채점 중… (20초쯤 걸린다)" : "AI 채점 받기"}
        </button>
        <button
          onClick={handleSave}
          disabled={!body.trim()}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
        >
          <Save className="h-4 w-4" />
          {saved ? "저장됨" : grade ? "채점 결과와 함께 저장" : "저장"}
        </button>
        {body.trim() && (
          <button
            onClick={startNew}
            className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-500 dark:border-zinc-700"
          >
            새로 쓰기
          </button>
        )}
      </div>

      {grader.offline && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {OFFLINE_MESSAGE} 자동 점검과 저장은 오프라인에서도 그대로 된다.
        </p>
      )}

      {!readyForGrading && body.trim() && !grade && (
        <p className="text-xs leading-relaxed text-zinc-400">
          {failCount > 0
            ? "위의 빨간 항목을 먼저 고치는 걸 권한다. 분량 미달이나 문체 혼용은 AI에게 묻지 않아도 감점이 확실하다."
            : "노란 항목이 남아 있다. 고치고 채점받으면 더 쓸모 있는 피드백이 나온다."}
        </p>
      )}

      {gradeError && (
        <p className="rounded-xl bg-red-50 p-3 text-sm leading-relaxed text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {gradeError}
        </p>
      )}

      {grade && <GradeResultPanel result={grade} />}

      <section>
        <h2 className="mb-3 text-lg font-semibold">과거 작성물</h2>
        {data.writingEntries.length === 0 ? (
          <p className="text-sm text-zinc-500">아직 작성물이 없다.</p>
        ) : (
          <div className="space-y-2">
            {[...data.writingEntries].reverse().map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-700"
              >
                <button
                  onClick={() => setViewId(e.id)}
                  className="min-w-0 flex-1 text-left text-sm hover:underline"
                >
                  <span className="text-zinc-500">{e.date}</span>
                  <span className="mx-1.5 text-zinc-300">·</span>
                  {e.charCount}자
                  {e.aiScore !== undefined && (
                    <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                      {e.aiScore}/{e.aiMax ?? 50}
                    </span>
                  )}
                  <span className="ja-ui mt-0.5 block truncate text-xs text-zinc-400">
                    {e.prompt}
                  </span>
                </button>
                <button
                  onClick={() => removeWritingEntry(e.id)}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:text-red-500"
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

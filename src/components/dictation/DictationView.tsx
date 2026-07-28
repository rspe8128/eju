"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  Headphones,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { speak, useSpeechSupport } from "@/lib/speech";
import { scoreDictation, type DictationScore } from "@/lib/dictation/score";
import {
  DICTATION_LEVELS,
  sentencesByLevel,
  type DictationSentence,
} from "@/lib/data/dictation/sentences";
import { cn } from "@/lib/utils";

/** 푼 문장 기록. 진도만 남기므로 AppData가 아니라 별도 키에 둔다. */
const PROGRESS_KEY = "eju.dictation.progress.v1";

type Progress = Record<string, { accuracy: number; at: string }>;

function loadProgress(): Progress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

function saveProgress(p: Progress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

/**
 * 채점 결과를 색으로 칠해 보여준다.
 * 예전에는 맞았는지 틀렸는지만 알려줬는데, 받아쓰기에서 정작 필요한 정보는
 * "어느 글자를 못 들었나"다. 그걸 눈으로 봐야 다음에 들린다.
 */
function DiffView({ score }: { score: DictationScore }) {
  return (
    <p className="ja-body text-[15px] leading-loose">
      {score.segments.map((s, i) => {
        if (s.op === "same") return <span key={i}>{s.text}</span>;
        if (s.op === "missing")
          return (
            <span
              key={i}
              title="못 들은 부분"
              className="rounded bg-red-100 px-0.5 font-bold text-red-700 dark:bg-red-900/50 dark:text-red-300"
            >
              {s.text}
            </span>
          );
        return (
          <span
            key={i}
            title="정답에 없는 부분"
            className="rounded bg-zinc-200 px-0.5 text-zinc-500 line-through dark:bg-zinc-700"
          >
            {s.text}
          </span>
        );
      })}
    </p>
  );
}

function DiffLegend() {
  return (
    <p className="mt-2 text-[11px] text-zinc-500">
      <span className="rounded bg-red-100 px-1 font-bold text-red-700 dark:bg-red-900/50 dark:text-red-300">
        빨강
      </span>
      {" = 못 들은 글자 · "}
      <span className="rounded bg-zinc-200 px-1 text-zinc-500 line-through dark:bg-zinc-700">
        취소선
      </span>
      {" = 정답에 없는 글자"}
    </p>
  );
}

export function DictationView() {
  const { data, addDictationEntry, removeDictationEntry } = useStorage();
  const speechSupported = useSpeechSupport();

  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState<DictationScore | null>(null);
  const [rate, setRate] = useState(1);
  const [plays, setPlays] = useState(0);
  const [strict, setStrict] = useState(true);
  const [progress, setProgress] = useState<Progress>({});
  const [tab, setTab] = useState<"builtin" | "mine">("builtin");

  const [title, setTitle] = useState("");
  const [answer, setAnswer] = useState("");
  const [myId, setMyId] = useState<string | null>(null);

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    setProgress(loadProgress());
  }, []);

  const list = useMemo(() => sentencesByLevel(level), [level]);
  const myEntry = data.dictationEntries.find((e) => e.id === myId);
  const current: DictationSentence | undefined = list[index];
  const target = tab === "mine" ? myEntry?.answer : current?.ja;

  const reset = useCallback(() => {
    setInput("");
    setScore(null);
    setPlays(0);
  }, []);

  useEffect(() => {
    reset();
  }, [level, index, myId, tab, reset]);

  const play = () => {
    if (!target) return;
    // 실전 모드에서는 EJU와 같이 한 번만 들려준다. 채점 후에는 몇 번이든 들을 수 있다.
    if (strict && plays >= 1 && !score) return;
    setPlays((p) => p + 1);
    speak(target, { lang: "ja", rate });
  };

  const check = () => {
    if (!target) return;
    const s = scoreDictation(target, input);
    setScore(s);
    if (tab === "builtin" && current) {
      const next = {
        ...progress,
        [current.id]: { accuracy: s.accuracy, at: new Date().toISOString() },
      };
      setProgress(next);
      saveProgress(next);
    }
  };

  const giveUp = () => {
    if (!target) return;
    setScore(scoreDictation(target, ""));
  };

  const go = (delta: number) =>
    setIndex((i) => Math.max(0, Math.min(list.length - 1, i + delta)));

  const levelMeta = DICTATION_LEVELS.find((l) => l.level === level)!;
  const doneInLevel = list.filter((s) => progress[s.id]).length;
  const avgInLevel = useMemo(() => {
    const vals = list
      .map((s) => progress[s.id]?.accuracy)
      .filter((v): v is number => v !== undefined);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [list, progress]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">청해 딕테이션</h1>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          듣고 받아쓰면 <b>틀린 글자를 하나하나 짚어 준다.</b> 어디를 못 들었는지 눈으로 봐야
          다음에 들린다.
        </p>
      </header>

      <div className="flex gap-2">
        {(["builtin", "mine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "bg-cyan-600 text-white"
                : "border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
            )}
          >
            {t === "builtin" ? "수록 문장 120" : `내가 넣은 문장 ${data.dictationEntries.length}`}
          </button>
        ))}
      </div>

      {!speechSupported && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          이 브라우저는 음성 재생(Web Speech API)을 지원하지 않는다. 최신 Chrome·Edge·Safari에서
          열거나, 정답을 가린 채 읽고 받아쓰는 방식으로 대신할 수 있다.
        </p>
      )}

      {tab === "builtin" ? (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {DICTATION_LEVELS.map((l) => (
                <button
                  key={l.level}
                  onClick={() => {
                    setLevel(l.level);
                    setIndex(0);
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                    level === l.level
                      ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                      : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">{levelMeta.hint}</p>
            <p className="text-[11px] text-zinc-400">
              {doneInLevel}/{list.length}문장 완료
              {avgInLevel !== null && ` · 평균 정확도 ${Math.round(avgInLevel * 100)}%`}
            </p>
          </div>

          {current && (
            <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>
                  {index + 1} / {list.length} · {current.topic}
                </span>
                {progress[current.id] && (
                  <span className="text-green-600 dark:text-green-400">
                    지난 정확도 {Math.round(progress[current.id].accuracy * 100)}%
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/50">
                <button
                  onClick={play}
                  disabled={!speechSupported || (strict && plays >= 1 && !score)}
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-40"
                >
                  <Volume2 className="h-4 w-4" />
                  {plays === 0 ? "재생" : "다시 재생"}
                </button>
                <span className="text-xs text-zinc-400">{plays}회 재생</span>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span>속도</span>
                  {[0.75, 1, 1.25].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRate(r)}
                      className={cn(
                        "rounded-full px-2 py-1",
                        rate === r
                          ? "bg-cyan-600 text-white"
                          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
                <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500">
                  <input
                    type="checkbox"
                    checked={strict}
                    onChange={(e) => setStrict(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-zinc-300"
                  />
                  실전 모드 (1회만)
                </label>
              </div>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                readOnly={!!score}
                placeholder="들은 대로 입력하세요. 구두점과 띄어쓰기는 채점에 넣지 않습니다."
                className="ja-body w-full rounded-xl border border-zinc-200 p-3 text-[15px] dark:border-zinc-700 dark:bg-zinc-900/50"
              />

              {!score ? (
                <div className="flex gap-2">
                  <button
                    onClick={check}
                    disabled={!input.trim()}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    채점하기
                  </button>
                  <button
                    onClick={giveUp}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-500 dark:border-zinc-700"
                    title="안 들리면 정답을 보고 넘어가도 된다"
                  >
                    <Eye className="h-4 w-4" />
                    포기
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    className={cn(
                      "rounded-xl p-3",
                      score.perfect
                        ? "bg-green-50 dark:bg-green-900/20"
                        : score.accuracy >= 0.8
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "bg-amber-50 dark:bg-amber-900/20"
                    )}
                  >
                    <p className="mb-2 flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                      {score.perfect && <Check className="h-4 w-4 text-green-600" />}
                      {score.perfect ? "완벽하다" : `정확도 ${Math.round(score.accuracy * 100)}%`}
                      <span className="text-xs font-normal text-zinc-500">
                        {score.correctChars}/{score.totalChars}자
                        {score.missingChars > 0 && ` · 놓침 ${score.missingChars}`}
                        {score.extraChars > 0 && ` · 잘못 씀 ${score.extraChars}`}
                      </span>
                    </p>
                    <DiffView score={score} />
                    <DiffLegend />
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="ja-body text-[15px]">{current.ja}</p>
                    <p className="mt-1.5 text-xs text-zinc-500">{current.ko}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={reset}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                      다시
                    </button>
                    <button
                      onClick={() => go(1)}
                      disabled={index >= list.length - 1}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-200 dark:text-zinc-900"
                    >
                      다음 문장
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-700">
                <button
                  onClick={() => go(-1)}
                  disabled={index === 0}
                  className="flex items-center gap-1 text-xs text-zinc-500 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  이전
                </button>
                <button
                  onClick={() => go(1)}
                  disabled={index >= list.length - 1}
                  className="flex items-center gap-1 text-xs text-zinc-500 disabled:opacity-30"
                >
                  건너뛰기
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-700">
            <h2 className="mb-3 text-sm font-semibold">새 문장 등록</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 (예: 강의 메모 1)"
              className="mb-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="정답 문장 (일본어)"
              rows={3}
              className="ja-body mb-3 w-full rounded-xl border border-zinc-200 p-3 text-[15px] dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              onClick={() => {
                if (!title.trim() || !answer.trim()) return;
                addDictationEntry({ title, answer });
                setTitle("");
                setAnswer("");
              }}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              등록
            </button>
          </section>

          {myEntry ? (
            <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
              <button
                onClick={() => setMyId(null)}
                className="flex items-center gap-1 text-sm text-zinc-500"
              >
                <ChevronLeft className="h-4 w-4" />
                목록
              </button>
              <h3 className="font-semibold">{myEntry.title}</h3>
              <button
                onClick={play}
                disabled={!speechSupported}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                <Volume2 className="h-4 w-4" />
                재생 ({plays}회)
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                readOnly={!!score}
                className="ja-body w-full rounded-xl border border-zinc-200 p-3 text-[15px] dark:border-zinc-700 dark:bg-zinc-900/50"
              />
              {!score ? (
                <button
                  onClick={check}
                  disabled={!input.trim()}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                >
                  채점하기
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">
                    정확도 {Math.round(score.accuracy * 100)}%
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      {score.correctChars}/{score.totalChars}자
                    </span>
                  </p>
                  <DiffView score={score} />
                  <DiffLegend />
                  <p className="ja-body rounded-xl border border-zinc-200 p-3 text-[15px] dark:border-zinc-700">
                    {myEntry.answer}
                  </p>
                  <button
                    onClick={reset}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                  >
                    다시
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section>
              <h2 className="mb-3 text-sm font-semibold">연습 목록</h2>
              {data.dictationEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <Headphones className="mx-auto h-7 w-7 text-zinc-300 dark:text-zinc-600" />
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    등록한 문장이 없다. 수업에서 받아 적은 문장을 넣어 두고 연습할 수 있다.
                  </p>
                  <button
                    onClick={() => setTab("builtin")}
                    className="mt-3 text-sm text-cyan-600 hover:underline"
                  >
                    수록 문장 120개로 연습하기 →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.dictationEntries.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-700"
                    >
                      <button
                        onClick={() => setMyId(e.id)}
                        className="text-sm font-medium hover:underline"
                      >
                        {e.title}
                      </button>
                      <button
                        onClick={() => removeDictationEntry(e.id)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:text-red-500"
                        aria-label="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

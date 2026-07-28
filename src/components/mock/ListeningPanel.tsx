"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, Square, Headphones, Eye } from "lucide-react";
import { speak, useSpeechSupport } from "@/lib/speech";
import { useTranslate } from "@/lib/mock/useTranslate";
import { useOnline, OFFLINE_MESSAGE } from "@/lib/useOnline";
import { TranslateButton, TranslateError } from "./TranslateButton";
import { cn } from "@/lib/utils";

/**
 * 청독해·청해 음성 패널.
 *
 * ── 지켜야 할 규칙 ────────────────────────────────────────────
 * 실전에서 음성은 **한 번만** 나오고, 스크립트는 시험지에 없다.
 * 그래서 풀 때는 글자를 절대 보여주지 않는다. 미리 읽어 버리면 듣기 연습이 아니라
 * 독해 연습이 되어 버린다.
 *
 * 채점한 뒤(review)에는 반대로 전부 공개한다. 복습에서 정작 필요한 것이
 * "내가 못 들은 부분이 무엇이었나"이기 때문이다. 번역도 이때만 열린다.
 */
export function ListeningPanel({
  scriptJa,
  leadJa,
  review = false,
}: {
  scriptJa: string[];
  leadJa?: string;
  review?: boolean;
}) {
  const supported = useSpeechSupport();
  const online = useOnline();
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [strict, setStrict] = useState(true);
  const [revealed, setRevealed] = useState(false);

  // 문항이 바뀌면 재생 횟수와 공개 상태를 초기화한다
  const key = scriptJa.join("|");
  useEffect(() => {
    setPlays(0);
    setPlaying(false);
    setRevealed(false);
  }, [key]);

  // 화면을 벗어날 때 읽던 것을 멈춘다. 안 그러면 다음 문항에서 겹쳐 들린다.
  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
  }, []);
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => () => stopRef.current(), []);

  const play = () => {
    const text = [leadJa, ...scriptJa].filter(Boolean).join(" ");
    if (!text) return;
    setPlays((p) => p + 1);
    setPlaying(true);
    speak(text, { lang: "ja", rate: 1 });
    // Web Speech API의 종료 이벤트는 브라우저마다 신뢰도가 낮아서,
    // 글자 수로 대략 시간을 잡아 버튼 상태만 되돌린다. 재생 자체와는 무관하다.
    const approxMs = Math.max(3000, text.length * 180);
    window.setTimeout(() => setPlaying(false), approxMs);
  };

  const locked = strict && plays >= 1 && !review;
  const showScript = review || revealed;

  return (
    <section className="rounded-2xl border border-cyan-200 bg-cyan-50/40 dark:border-cyan-900/60 dark:bg-cyan-900/10">
      <header className="flex items-center justify-between gap-3 border-b border-cyan-100 px-4 py-2.5 dark:border-cyan-900/60">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Headphones className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          음성
        </span>
        {!review && (
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-500">
            <input
              type="checkbox"
              checked={strict}
              onChange={(e) => setStrict(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-zinc-300"
            />
            실전 모드 (1회만)
          </label>
        )}
      </header>

      <div className="space-y-3 px-4 py-4">
        {!supported ? (
          <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            이 브라우저는 음성 재생(Web Speech API)을 지원하지 않는다. 최신 Chrome·Edge·Safari에서
            열거나, 아래 &quot;스크립트 보기&quot;로 읽으면서 풀 수 있다.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={playing ? stop : play}
              disabled={locked}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-40"
            >
              {playing ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {playing ? "정지" : plays === 0 ? "재생" : "다시 재생"}
            </button>
            <span className="text-xs text-zinc-500">{plays}회 재생</span>
            {locked && (
              <span className="text-[11px] text-zinc-400">
                실전은 1회다. 더 듣고 싶으면 실전 모드를 끄자.
              </span>
            )}
          </div>
        )}

        {!showScript ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <Eye className="h-3.5 w-3.5" />
            스크립트 보기 (실전에는 없다)
          </button>
        ) : (
          <ScriptBody scriptJa={scriptJa} leadJa={leadJa} online={online} />
        )}
      </div>
    </section>
  );
}

/** 공개된 스크립트 + 번역. 번역 훅은 공개된 뒤에만 붙는다. */
function ScriptBody({
  scriptJa,
  leadJa,
  online,
}: {
  scriptJa: string[];
  leadJa?: string;
  online: boolean;
}) {
  const texts = [leadJa, ...scriptJa].filter((t): t is string => Boolean(t));
  const tr = useTranslate(texts);
  const blocked = !online && !tr.cached && !tr.shown;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          스크립트
        </span>
        <TranslateButton
          shown={tr.shown}
          loading={tr.loading}
          cached={tr.cached}
          onClick={tr.toggle}
          label="번역"
          disabled={blocked}
          title={blocked ? OFFLINE_MESSAGE : undefined}
        />
      </div>
      <div className="ja-ui space-y-2 text-[15px]">
        {texts.map((line, i) => (
          <p key={i} className={cn(i === 0 && leadJa && "text-zinc-500")}>
            {line}
          </p>
        ))}
      </div>
      {tr.error && <TranslateError message={tr.error} />}
      {tr.shown && (
        <div className="mt-3 space-y-1.5 rounded-lg bg-blue-50/70 p-3 text-sm leading-relaxed text-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
          {tr.lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

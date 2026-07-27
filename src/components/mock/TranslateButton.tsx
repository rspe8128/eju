"use client";

import { Languages, Loader2, EyeOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "번역 보기" 토글 버튼.
 * 기본은 항상 접힌 상태다 — 실전에는 번역이 없으므로, 먼저 일본어로 풀고
 * 막혔을 때만 열어 보는 흐름을 강제한다.
 */
export function TranslateButton({
  shown,
  loading,
  cached,
  onClick,
  label = "한국어 번역",
  className,
}: {
  shown: boolean;
  loading: boolean;
  cached: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={cached ? "이미 번역해 둔 문장이라 바로 열립니다" : "DeepL로 번역합니다"}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
        shown
          ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          : "border-zinc-200 text-zinc-500 hover:border-blue-300 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-blue-400",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : shown ? (
        <EyeOff className="h-3.5 w-3.5" />
      ) : (
        <Languages className="h-3.5 w-3.5" />
      )}
      {loading ? "번역 중" : shown ? "번역 숨기기" : label}
      {!shown && !loading && cached && <Check className="h-3 w-3 text-green-500" />}
    </button>
  );
}

export function TranslateError({ message }: { message: string }) {
  return (
    <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-xs leading-relaxed text-red-700 dark:bg-red-900/20 dark:text-red-300">
      {message}
    </p>
  );
}

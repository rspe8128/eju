"use client";

import { useState } from "react";
import { Languages, Loader2, Copy, Check, Trash2 } from "lucide-react";

/**
 * 시험 중 지문 번역 패널.
 *
 * 기출 PDF에서 읽기 어려운 문단을 드래그해 복사 → 여기 붙여넣으면 한국어로 번역된다.
 * 번역 결과는 어디에도 저장하지 않는다 (화면에서만 존재).
 */
export function TranslatePanel({ compact = false }: { compact?: boolean }) {
  const [source, setSource] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const translate = async () => {
    if (!source.trim()) return;
    setLoading(true);
    setError(null);
    setResult("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source, sourceLang: "JA", targetLang: "KO" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "번역에 실패했습니다.");
      } else {
        setResult(json.text ?? "");
      }
    } catch {
      setError("서버에 연결하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Languages className="h-4 w-4 text-blue-500" />
          지문 번역 (일본어 → 한국어)
        </h3>
        {(source || result) && (
          <button
            onClick={() => {
              setSource("");
              setResult("");
              setError(null);
            }}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-500"
          >
            <Trash2 className="h-3 w-3" />
            비우기
          </button>
        )}
      </div>

      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="PDF에서 지문을 드래그해 복사한 뒤 여기에 붙여넣으세요 (Ctrl+V)"
        rows={compact ? 4 : 6}
        className="w-full resize-y rounded-xl border border-zinc-200 bg-white p-3 text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-800"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={translate}
          disabled={loading || !source.trim()}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          번역
        </button>
        <span className="text-xs text-zinc-400">{source.length}자</span>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="relative rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
          <button
            onClick={copy}
            className="absolute right-2 top-2 rounded p-1 text-zinc-400 hover:text-blue-600"
            aria-label="번역 결과 복사"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <p className="whitespace-pre-wrap pr-6 text-sm leading-relaxed">{result}</p>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-zinc-400">
        번역은 이해를 돕는 보조 수단이다. 실전에서는 번역이 없으므로, 먼저 일본어로 풀어보고
        채점 뒤에 확인용으로 쓰는 걸 권한다.
      </p>
    </div>
  );
}

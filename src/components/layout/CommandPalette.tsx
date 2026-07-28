"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStorage } from "@/context/StorageContext";

const staticLinks = [
  { label: "대시보드", href: "/" },
  { label: "EJU 가이드", href: "/guide" },
  { label: "오늘의 학습", href: "/study/today" },
  { label: "일본어", href: "/study/japanese" },
  { label: "단어장 보관함", href: "/study/library" },
  { label: "과목 용어", href: "/study/terms" },
  { label: "TOEFL", href: "/study/toefl" },
  { label: "모의고사", href: "/mock" },
  { label: "약점 분석", href: "/stats" },
  { label: "교과목", href: "/study/subjects" },
  { label: "학습 플랜", href: "/plan" },
  { label: "성적", href: "/scores" },
  { label: "기술(작문)", href: "/writing" },
  { label: "딕테이션", href: "/dictation" },
  { label: "오답노트", href: "/review" },
  { label: "일정", href: "/schedule" },
  { label: "설정", href: "/settings" },
];

const TERM_SUBJECTS = new Set(["math", "sogo", "physics", "chemistry", "biology"]);

function deckHref(subject: string | undefined): string {
  if (subject === "toefl") return "/study/toefl";
  if (subject && TERM_SUBJECTS.has(subject)) return "/study/terms";
  return "/study/japanese";
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data } = useStorage();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: { label: string; href: string; sub?: string }[] = [];

    for (const link of staticLinks) {
      if (!q || link.label.toLowerCase().includes(q)) {
        items.push({ label: link.label, href: link.href, sub: "페이지" });
      }
    }

    for (const card of data.cards) {
      if (
        !q ||
        card.front.toLowerCase().includes(q) ||
        card.back.toLowerCase().includes(q) ||
        card.reading?.toLowerCase().includes(q)
      ) {
        const deck = data.decks.find((d) => d.id === card.deckId);
        items.push({
          label: `${card.front} — ${card.back}`,
          href: deckHref(deck?.subject),
          sub: deck?.title ?? "카드",
        });
      }
      if (items.length > 30) break;
    }

    for (const item of data.items) {
      if (!q || item.title.toLowerCase().includes(q)) {
        const unit = data.units.find((u) => u.id === item.unitId);
        items.push({
          label: item.title,
          href: unit ? `/study/subjects/${unit.subjectId}` : "/study/subjects",
          sub: item.type === "concept" ? "개념" : "문제",
        });
      }
      if (items.length > 40) break;
    }

    return items.slice(0, 20);
  }, [query, data]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-700">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색... (카드, 개념, 페이지)"
            className="w-full bg-transparent py-3 text-sm outline-none"
            aria-label="전역 검색"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-zinc-500">결과 없음</li>
          )}
          {results.map((r, i) => (
            <li key={`${r.href}-${r.label}-${i}`}>
              <button
                onClick={() => {
                  router.push(r.href);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="truncate">{r.label}</span>
                <span className="ml-2 shrink-0 text-xs text-zinc-400">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

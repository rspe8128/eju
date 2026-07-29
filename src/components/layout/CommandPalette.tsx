"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStorage } from "@/context/StorageContext";
import { buildNavSections, OPEN_COMMAND_PALETTE } from "@/lib/nav";

/** 사이드 메뉴와 같은 위계를 그대로 쓴다(라벨/그룹이 두 곳에서 갈라지지 않도록). */
const staticLinks = buildNavSections(true).flatMap((section) =>
  section.kind === "link"
    ? [{ label: section.label, href: section.href, group: "" }]
    : section.items.map((item) => ({
        label: item.label,
        href: item.href,
        group: section.label,
      }))
);

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
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: { label: string; href: string; sub?: string }[] = [];

    for (const link of staticLinks) {
      if (!q || link.label.toLowerCase().includes(q) || link.group.toLowerCase().includes(q)) {
        items.push({ label: link.label, href: link.href, sub: link.group || "페이지" });
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

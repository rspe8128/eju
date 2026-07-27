"use client";

import { useState } from "react";
import { useStorage } from "@/context/StorageContext";
import { DeckStudyView } from "./DeckStudyView";
import { cn } from "@/lib/utils";
import { getSubjectColor } from "@/lib/types";

const TERM_SUBJECTS = [
  { code: "math", label: "수학" },
  { code: "sogo", label: "종합과목" },
  { code: "physics", label: "물리" },
  { code: "chemistry", label: "화학" },
  { code: "biology", label: "생물" },
] as const;

export function TermsView() {
  const { data, getDecksBySubject, getCardsByDeck } = useStorage();
  const [active, setActive] = useState<string>(TERM_SUBJECTS[0].code);

  const activeLabel =
    TERM_SUBJECTS.find((s) => s.code === active)?.label ?? active;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">과목 일본어 용어</h1>
        <p className="mt-1 text-sm text-zinc-500">
          EJU는 내용보다 일본어 용어에서 막힌다. 과목별 전문용어를 먼저 외워두자.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {TERM_SUBJECTS.map((s) => {
          const decks = getDecksBySubject(s.code);
          const cardCount = decks.reduce(
            (sum, d) => sum + getCardsByDeck(d.id).length,
            0
          );
          const color = getSubjectColor(s.code, data.subjects);
          const isActive = active === s.code;
          return (
            <button
              key={s.code}
              onClick={() => setActive(s.code)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-transparent text-white"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
              )}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              {s.label}
              <span className={cn("ml-2 text-xs", isActive ? "opacity-80" : "text-zinc-400")}>
                {cardCount}
              </span>
            </button>
          );
        })}
      </div>

      <DeckStudyView key={active} subject={active} subjectLabel={activeLabel} />
    </div>
  );
}

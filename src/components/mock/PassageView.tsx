"use client";

import { useState } from "react";
import { BookOpen, Table2, Megaphone, BookMarked, ChevronDown } from "lucide-react";
import type { MockPassage, MockTable } from "@/lib/mock/types";
import { passageTexts, splitPassageTranslation } from "@/lib/mock/types";
import { useTranslate } from "@/lib/mock/useTranslate";
import { TranslateButton, TranslateError } from "./TranslateButton";
import { cn } from "@/lib/utils";

const KIND_META: Record<string, { icon: typeof BookOpen; label: string }> = {
  prose: { icon: BookOpen, label: "지문" },
  notice: { icon: Megaphone, label: "실용문" },
  chart: { icon: Table2, label: "도표" },
  script: { icon: BookOpen, label: "스크립트" },
};

function TableBlock({ table, muted = false }: { table: MockTable; muted?: boolean }) {
  return (
    <div className="my-3">
      {table.caption && (
        <p className={cn("mb-1.5 text-xs font-medium", muted ? "text-blue-700 dark:text-blue-300" : "text-zinc-500")}>
          {table.caption}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr>
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "border px-2.5 py-1.5 text-left font-semibold",
                    muted
                      ? "border-blue-200 bg-blue-100/50 dark:border-blue-900 dark:bg-blue-900/30"
                      : "border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-700/60"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={cn(
                      "border px-2.5 py-1.5",
                      muted ? "border-blue-200 dark:border-blue-900" : "border-zinc-300 dark:border-zinc-600",
                      c > 0 && "text-right tabular-nums"
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.footnote && (
        <p className="mt-1.5 text-[11px] text-zinc-500">{table.footnote}</p>
      )}
    </div>
  );
}

export function PassageView({ passage }: { passage: MockPassage }) {
  const texts = passageTexts(passage);
  const tr = useTranslate(texts);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const meta = KIND_META[passage.kind] ?? KIND_META.prose;
  const Icon = meta.icon;
  const ko = tr.shown ? splitPassageTranslation(passage, tr.lines) : null;
  const isNotice = passage.kind === "notice";

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-700">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="truncate text-sm font-semibold">{passage.title ?? meta.label}</span>
        </div>
        <TranslateButton
          shown={tr.shown}
          loading={tr.loading}
          cached={tr.cached}
          onClick={tr.toggle}
          label="지문 번역"
        />
      </header>

      <div className="px-4 py-4">
        {passage.leadJa && (
          <p className="ja-ui mb-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
            {passage.leadJa}
          </p>
        )}

        <div className={cn(isNotice ? "ja-ui space-y-1.5 text-[15px]" : "ja-body space-y-4 text-[15px]")}>
          {passage.ja.map((para, i) => (
            <p key={i} className={cn(isNotice && para.startsWith("・") && "pl-2")}>
              {para}
            </p>
          ))}
        </div>

        {passage.table && <TableBlock table={passage.table} />}

        {tr.error && <TranslateError message={tr.error} />}

        {ko && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-900/15">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              한국어 번역
            </p>
            {ko.lead && (
              <p className="mb-2 text-sm text-blue-900/80 dark:text-blue-200/80">{ko.lead}</p>
            )}
            <div className={cn("text-[15px] leading-relaxed", isNotice ? "space-y-1.5" : "space-y-3")}>
              {ko.paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {ko.table && <TableBlock table={ko.table} muted />}
            <p className="mt-3 text-[11px] text-blue-700/70 dark:text-blue-300/60">
              DeepL 기계 번역이다. 뜻을 잡는 용도로만 쓰고, 조사·문말 표현은 반드시 원문으로 확인하자.
            </p>
          </div>
        )}

        {passage.glossary && passage.glossary.length > 0 && (
          <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setGlossaryOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              <BookMarked className="h-3.5 w-3.5" />
              어휘 {passage.glossary.length}개
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", glossaryOpen && "rotate-180")} />
            </button>
            {glossaryOpen && (
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {passage.glossary.map((g) => (
                  <li key={g.ja} className="flex gap-2 text-xs">
                    <span className="font-medium">
                      {g.ja}
                      {g.reading && <span className="ml-1 text-zinc-400">（{g.reading}）</span>}
                    </span>
                    <span className="text-zinc-500">{g.ko}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

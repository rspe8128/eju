"use client";

import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";

const GROUPS: { title: string; items: { keys: string[]; desc: string }[] }[] = [
  {
    title: "어디서나",
    items: [
      { keys: ["⌘K", "Ctrl+K"], desc: "검색 (카드 · 개념 · 페이지)" },
      { keys: ["?"], desc: "이 도움말" },
      { keys: ["Esc"], desc: "열린 창 닫기" },
    ],
  },
  {
    title: "플래시카드",
    items: [
      { keys: ["Space"], desc: "카드 뒤집기" },
      { keys: ["1"], desc: "모름" },
      { keys: ["2"], desc: "헷갈림" },
      { keys: ["3"], desc: "기억함" },
      { keys: ["H"], desc: "힌트" },
      { keys: ["S"], desc: "발음 듣기" },
      { keys: ["U", "Ctrl+Z"], desc: "방금 매긴 평가 되돌리기" },
    ],
  },
  {
    title: "모의고사",
    items: [
      { keys: ["←", "→"], desc: "이전 / 다음 문항" },
      { keys: ["1~4"], desc: "답 선택" },
    ],
  },
];

/**
 * `?` 로 여는 단축키 목록.
 *
 * 단축키는 원래 있었지만 플래시카드 화면 구석의 작은 글씨 한 줄이 전부라,
 * 모의고사나 검색 쪽 단축키는 알 방법이 없었다.
 */
export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // 입력 중에는 물음표가 그냥 글자다.
      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable;
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Keyboard className="h-5 w-5 text-zinc-400" />
            키보드 단축키
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {group.title}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.desc} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 text-zinc-600 dark:text-zinc-300">{item.desc}</span>
                    <span className="flex shrink-0 gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

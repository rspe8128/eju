"use client";

import { cn } from "@/lib/utils";

export type FilterTab = {
  id: string;
  label: string;
  /** 탭 옆에 붙는 수 (담은 개수 / 전체 개수 등) */
  count?: number;
  /** 담은 것만 보는 탭처럼 강조가 필요한 경우 */
  highlight?: boolean;
};

/** 보관함 목록을 좁혀 보는 탭 줄. 단어장·모듈 보관함이 같이 쓴다. */
export function FilterTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: FilterTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-pressed={isActive}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "text-xs",
                  isActive
                    ? "opacity-70"
                    : tab.highlight && tab.count > 0
                      ? "font-semibold text-green-600 dark:text-green-400"
                      : "text-zinc-400"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { Monitor, MonitorSmartphone, Smartphone, type LucideIcon } from "lucide-react";
import { useLayout, type LayoutMode } from "@/context/LayoutContext";
import { cn } from "@/lib/utils";

const OPTIONS: { value: LayoutMode; label: string; icon: LucideIcon; desc: string }[] = [
  { value: "auto", label: "자동", icon: MonitorSmartphone, desc: "화면 폭에 맞춰 전환" },
  { value: "mobile", label: "모바일", icon: Smartphone, desc: "☰ 메뉴 + 하단 탭" },
  { value: "desktop", label: "PC", icon: Monitor, desc: "왼쪽 고정 사이드바" },
];

/**
 * 화면 UI(모바일/PC) 선택기.
 * compact는 사이드바 하단용, 기본형은 설정 화면용.
 */
export function LayoutModePicker({ compact = false }: { compact?: boolean }) {
  const { mode, autoLayout, setMode } = useLayout();

  if (compact) {
    return (
      <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            title={`${label} UI`}
            aria-pressed={mode === value}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
              mode === value
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, icon: Icon, desc }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              mode === value
                ? "border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-500/10"
                : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
            )}
          >
            <Icon
              className={cn(
                "mb-2 h-5 w-5",
                mode === value ? "text-red-500" : "text-zinc-400"
              )}
            />
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
          </button>
        ))}
      </div>
      {mode === "auto" && (
        <p className="text-xs text-zinc-500">
          지금 이 화면은 <span className="font-medium">{autoLayout === "desktop" ? "PC" : "모바일"}</span> UI로
          보이고 있다.
        </p>
      )}
    </div>
  );
}

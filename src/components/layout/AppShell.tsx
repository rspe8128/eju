"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Calendar,
  ClipboardList,
  FlaskConical,
  Home,
  Info,
  Languages,
  Moon,
  PenLine,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  Timer,
  TrendingUp,
  Headphones,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { PomodoroTimer } from "./PomodoroTimer";
import { CommandPalette } from "./CommandPalette";

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "오늘",
    items: [
      { href: "/", label: "대시보드", icon: Home },
      { href: "/study/today", label: "오늘의 학습", icon: Sparkles },
      { href: "/plan", label: "플랜", icon: ClipboardList },
      { href: "/review", label: "오답노트", icon: RotateCcw },
    ],
  },
  {
    title: "학습",
    items: [
      { href: "/study/japanese", label: "일본어", icon: Languages },
      { href: "/study/terms", label: "과목 용어", icon: BookMarked },
      { href: "/study/toefl", label: "TOEFL", icon: BookOpen },
      { href: "/study/subjects", label: "교과목", icon: FlaskConical },
      { href: "/writing", label: "작문", icon: PenLine },
      { href: "/dictation", label: "딕테이션", icon: Headphones },
    ],
  },
  {
    title: "시험",
    items: [
      { href: "/mock", label: "모의고사", icon: Timer },
      { href: "/scores", label: "성적", icon: TrendingUp },
      { href: "/stats", label: "약점 분석", icon: BarChart3 },
      { href: "/schedule", label: "일정", icon: Calendar },
    ],
  },
  {
    title: "정보",
    items: [
      { href: "/guide", label: "EJU 가이드", icon: Info },
      { href: "/settings", label: "설정", icon: Settings },
    ],
  },
];

/** 모바일 하단 탭 (가장 자주 쓰는 5개) */
const mobileNavItems: NavItem[] = [
  { href: "/", label: "대시보드", icon: Home },
  { href: "/study/today", label: "오늘", icon: Sparkles },
  { href: "/study/japanese", label: "일본어", icon: Languages },
  { href: "/study/terms", label: "용어", icon: BookMarked },
  { href: "/review", label: "오답", icon: RotateCcw },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen">
      <CommandPalette />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        <div className="border-b border-zinc-200 px-5 py-6 dark:border-zinc-800">
          <h1 className="text-lg font-bold">EJU Study</h1>
          <p className="text-xs text-zinc-500">일본 유학 준비</p>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {group.title}
              </p>
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === href || (href !== "/" && pathname.startsWith(href))
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <button
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "라이트 모드" : "다크 모드"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
          <h1 className="font-bold lg:hidden">EJU Study</h1>
          <p className="hidden text-xs text-zinc-400 lg:block">⌘K / Ctrl+K 검색</p>
          <div className="flex items-center gap-2">
            <PomodoroTimer />
            <button
              onClick={toggle}
              className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
              aria-label="테마 전환"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <nav className="fixed bottom-0 left-0 right-0 z-30 flex overflow-x-auto border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
          {mobileNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
                pathname === href || (href !== "/" && pathname.startsWith(href))
                  ? "text-red-500"
                  : "text-zinc-500"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 pb-24 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

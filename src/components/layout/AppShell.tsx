"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  FlaskConical,
  Home,
  Info,
  Languages,
  Library,
  Moon,
  PenLine,
  RotateCcw,
  Settings,
  UserCircle2,
  Sparkles,
  Sun,
  TrendingUp,
  Headphones,
  LogOut,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

type NavItem = { href: string; label: string; icon: LucideIcon };
import { useTheme } from "@/context/ThemeContext";
import { useStorage } from "@/context/StorageContext";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";
import { PomodoroTimer } from "./PomodoroTimer";
import { CommandPalette } from "./CommandPalette";

function buildNavGroups(isAdmin: boolean): { title: string; items: NavItem[] }[] {
  const infoItems: NavItem[] = [
    { href: "/guide", label: "EJU 가이드", icon: Info },
    { href: "/profile", label: "프로필", icon: UserCircle2 },
    { href: "/settings", label: "설정", icon: Settings },
  ];
  if (isAdmin) {
    infoItems.push({ href: "/admin", label: "계정 관리", icon: Shield });
  }

  return [
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
        { href: "/study/library", label: "단어장 보관함", icon: Library },
        { href: "/study/modules", label: "학습 모듈 보관함", icon: Library },
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
        { href: "/mock", label: "모의고사", icon: FileText },
        { href: "/scores", label: "성적", icon: TrendingUp },
        { href: "/stats", label: "약점 분석", icon: BarChart3 },
        { href: "/schedule", label: "일정", icon: Calendar },
      ],
    },
    {
      title: "정보",
      items: infoItems,
    },
  ];
}

/** 모바일 하단 탭 (가장 자주 쓰는 5개) */
const mobileNavItems: NavItem[] = [
  { href: "/", label: "대시보드", icon: Home },
  { href: "/study/today", label: "오늘", icon: Sparkles },
  { href: "/study/japanese", label: "일본어", icon: Languages },
  { href: "/mock", label: "모의고사", icon: FileText },
  { href: "/review", label: "오답", icon: RotateCcw },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { syncInfo } = useStorage();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileName, setProfileName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const navGroups = useMemo(() => buildNavGroups(isAdmin), [isAdmin]);

  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      if (!data.user) {
        setProfileName("");
        setAvatarUrl("");
        setIsAdmin(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, role")
        .eq("id", data.user.id)
        .maybeSingle();
      const p = profile as Pick<ProfileRow, "display_name" | "avatar_url" | "role"> | null;
      setProfileName(p?.display_name ?? "");
      setAvatarUrl(p?.avatar_url ?? "");
      setIsAdmin(p?.role === "admin");
    };
    void load();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => authListener.subscription.unsubscribe();
  }, [supabase]);

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
          <div className="mb-2 rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-700">
            {user ? (
              <div className="space-y-2">
                <Link href="/profile" className="flex items-center gap-2">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] text-zinc-500 dark:bg-zinc-700">
                      U
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {profileName || user.email || "사용자"}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">로그인됨</p>
                  </div>
                </Link>
                <p className="text-[10px] text-zinc-500">
                  {syncInfo.status === "offline"
                    ? `오프라인 대기 ${syncInfo.pendingCount}`
                    : syncInfo.status === "synced"
                      ? "동기화됨"
                      : syncInfo.status === "syncing"
                        ? "동기화 중"
                        : syncInfo.status === "error"
                          ? "동기화 실패"
                          : syncInfo.status === "conflict"
                            ? "충돌 해결 필요"
                            : "동기화 대기"}
                </p>
                <button
                  onClick={() => void supabase?.auth.signOut()}
                  className="flex w-full items-center justify-center gap-1 rounded-md border border-zinc-200 px-2 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="block rounded-md bg-blue-600 px-2 py-2 text-center text-xs font-medium text-white hover:bg-blue-700"
              >
                로그인 / 회원가입
              </Link>
            )}
          </div>
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

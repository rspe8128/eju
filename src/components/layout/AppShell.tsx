"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { useTheme } from "@/context/ThemeContext";
import { useStorage } from "@/context/StorageContext";
import { cn } from "@/lib/utils";
import {
  buildNavSections,
  findActiveNav,
  isActiveHref,
  OPEN_COMMAND_PALETTE,
} from "@/lib/nav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";
import { PomodoroTimer } from "./PomodoroTimer";
import { CommandPalette } from "./CommandPalette";

const SYNC_LABEL: Record<string, string> = {
  offline: "오프라인 대기",
  synced: "동기화됨",
  syncing: "동기화 중",
  error: "동기화 실패",
  conflict: "충돌 해결 필요",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { syncInfo } = useStorage();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileName, setProfileName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);

  const navSections = useMemo(() => buildNavSections(isAdmin), [isAdmin]);
  const active = useMemo(
    () => findActiveNav(navSections, pathname),
    [navSections, pathname]
  );
  const isLoginPage = pathname === "/login";
  const showAppChrome = Boolean(user) && !isLoginPage;

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      if (!data.user) {
        setProfileName("");
        setAvatarUrl("");
        setIsAdmin(false);
        setAuthReady(true);
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
      setAuthReady(true);
    };
    void load();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => authListener.subscription.unsubscribe();
  }, [supabase]);

  /** 페이지를 옮기면 메뉴는 닫고, 현재 페이지가 속한 섹션만 펼쳐 둔다. */
  useEffect(() => {
    setMenuOpen(false);
    if (active?.section.kind === "group") {
      const id = active.section.id;
      setExpanded((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  }, [pathname, active?.section]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [menuOpen]);

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
    window.location.href = "/login";
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        불러오는 중...
      </div>
    );
  }

  if (!showAppChrome) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="font-bold">EJU Study</h1>
          <button
            onClick={toggle}
            className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="테마 전환"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    );
  }

  const sectionLabel = active?.section.label;
  const pageLabel = active?.link?.label;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <CommandPalette />

      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-zinc-200 bg-white/85 px-3 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          aria-label="메뉴 열기"
          aria-expanded={menuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] leading-tight text-zinc-400">
            {sectionLabel && pageLabel ? sectionLabel : "EJU Study"}
          </p>
          <p className="truncate text-sm font-semibold leading-tight">
            {pageLabel ?? sectionLabel ?? "EJU Study"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="검색"
            title="검색 (⌘K / Ctrl+K)"
          >
            <Search className="h-5 w-5" />
          </button>
          <PomodoroTimer />
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="테마 전환"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] max-w-[85vw] flex-col border-r border-zinc-200 bg-white shadow-xl transition-[transform,visibility] duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900",
          // 닫혀 있을 때 visibility:hidden — 화면 밖 링크가 탭 순서에 남지 않도록.
          menuOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        )}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-start justify-between border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <div>
            <h1 className="text-base font-bold">EJU Study</h1>
            <p className="text-xs text-zinc-500">일본 유학 준비</p>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navSections.map((section) => {
            const Icon = section.icon;

            if (section.kind === "link") {
              const isActive = isActiveHref(section.href, pathname);
              return (
                <Link
                  key={section.id}
                  href={section.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {section.label}
                </Link>
              );
            }

            const isOpen = expanded.includes(section.id);
            const hasActive = section.items.some((item) =>
              isActiveHref(item.href, pathname)
            );

            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    hasActive
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">{section.label}</span>
                  {hasActive && !isOpen && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <ul className="ml-[1.4rem] space-y-0.5 border-l border-zinc-200 pb-1 pl-2 dark:border-zinc-700">
                    {section.items.map((item) => {
                      const isActive = isActiveHref(item.href, pathname);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={cn(
                              "block rounded-md px-3 py-2 transition-colors",
                              isActive
                                ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                            )}
                          >
                            <span className="block text-sm font-medium">{item.label}</span>
                            {item.desc && (
                              <span className="block truncate text-[11px] text-zinc-400">
                                {item.desc}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-700">
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
                  {profileName || user?.email || "사용자"}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {SYNC_LABEL[syncInfo.status] ?? "동기화 대기"}
                  {syncInfo.status === "offline" ? ` ${syncInfo.pendingCount}` : ""}
                </p>
              </div>
            </Link>
            <button
              onClick={() => void signOut()}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-zinc-200 px-2 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-6xl p-4 lg:p-8">{children}</main>
    </div>
  );
}

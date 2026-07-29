"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Search,
  Sun,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { useTheme } from "@/context/ThemeContext";
import { useStorage } from "@/context/StorageContext";
import { useLayout } from "@/context/LayoutContext";
import { cn } from "@/lib/utils";
import {
  allGroupIds,
  buildNavSections,
  findActiveNav,
  isActiveHref,
  mobileTabs,
  OPEN_COMMAND_PALETTE,
  type NavSection,
} from "@/lib/nav";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";
import { PomodoroTimer } from "./PomodoroTimer";
import { CommandPalette } from "./CommandPalette";
import { LayoutModePicker } from "./LayoutModePicker";
import { ShortcutHelp } from "./ShortcutHelp";

const SYNC_LABEL: Record<string, string> = {
  offline: "오프라인 대기",
  synced: "동기화됨",
  syncing: "동기화 중",
  error: "동기화 실패",
  conflict: "충돌 해결 필요",
};

const MOBILE_TAB_HEIGHT = "3.5rem";

/** 모바일 드로어와 PC 사이드바가 공유하는 위계 메뉴. */
function NavTree({
  sections,
  pathname,
  expanded,
  onToggle,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  expanded: string[];
  onToggle: (id: string) => void;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-2">
      {sections.map((section) => {
        const Icon = section.icon;

        if (section.kind === "link") {
          const isActive = isActiveHref(section.href, pathname);
          return (
            <Link
              key={section.id}
              href={section.href}
              onClick={onNavigate}
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
        const hasActive = section.items.some((item) => isActiveHref(item.href, pathname));

        return (
          <div key={section.id}>
            <button
              onClick={() => onToggle(section.id)}
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
              {hasActive && !isOpen && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
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
                  const ItemIcon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-red-50 font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                        )}
                      >
                        <ItemIcon className="h-4 w-4 shrink-0 opacity-60" />
                        {item.label}
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
  );
}

function SidebarFooter({
  name,
  avatarUrl,
  syncText,
  onSignOut,
}: {
  name: string;
  avatarUrl: string;
  syncText: string;
  onSignOut: () => void;
}) {
  return (
    <div className="space-y-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
      <LayoutModePicker compact />
      <div className="rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-700">
        <Link href="/profile" className="flex items-center gap-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] text-zinc-500 dark:bg-zinc-700">
              U
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{name}</p>
            <p className="truncate text-[11px] text-zinc-500">{syncText}</p>
          </div>
        </Link>
        <button
          onClick={onSignOut}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-zinc-200 px-2 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <LogOut className="h-3.5 w-3.5" />
          로그아웃
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { syncInfo } = useStorage();
  const { layout } = useLayout();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileName, setProfileName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const headerObserver = useRef<ResizeObserver | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // 기본은 전부 펼침. 접는 건 안 쓰는 영역을 치우고 싶을 때만 하는 선택이다.
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const navSections = useMemo(() => buildNavSections(isAdmin), [isAdmin]);
  const expanded = useMemo(
    () => allGroupIds(navSections).filter((id) => !collapsed.includes(id)),
    [navSections, collapsed]
  );
  const active = useMemo(() => findActiveNav(navSections, pathname), [navSections, pathname]);
  const isLoginPage = pathname === "/login";
  const showAppChrome = Boolean(user) && !isLoginPage;
  const isMobile = layout === "mobile";

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

  /** 페이지를 옮기면 드로어를 닫고, 접어 둔 섹션으로 갔다면 도로 펼친다. */
  useEffect(() => {
    setDrawerOpen(false);
    if (active?.section.kind === "group") {
      const id = active.section.id;
      setCollapsed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev));
    }
  }, [pathname, active?.section]);

  /**
   * 모바일 드로어: Esc로 닫고, 열려 있는 동안 배경 스크롤을 막는다.
   * isMobile을 조건에 넣어야 드로어를 연 채 PC UI로 바꿔도 스크롤 잠금이 풀린다.
   */
  useEffect(() => {
    if (!drawerOpen || !isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [drawerOpen, isMobile]);

  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  /**
   * 하단 탭 높이를 CSS 변수로 알려준다.
   * 화면 안에서 bottom 고정 바를 쓰는 곳(모의고사 하단 바, PWA 배너)이
   * AppShell을 몰라도 탭을 피해 앉을 수 있도록.
   */
  useEffect(() => {
    const height = showAppChrome && isMobile ? MOBILE_TAB_HEIGHT : "0px";
    document.documentElement.style.setProperty("--bottom-nav-h", height);
  }, [showAppChrome, isMobile]);

  /**
   * 상단 헤더 높이도 같은 이유로 알려준다 — 페이지 안에서 sticky 탭 줄을 쓰는 곳
   * (보관함 필터)이 헤더 밑에 정확히 붙게. 모바일/PC에 따라 헤더 높이가 달라서
   * 값을 박아 두면 한쪽이 어긋난다.
   *
   * useEffect가 아니라 콜백 ref인 이유: 헤더는 로그인 확인이 끝난 뒤에야 붙는데,
   * effect를 쓰면 헤더가 없던 시점에 한 번 돌고 다시 돌지 않아 0px로 남는다.
   */
  const headerRef = useCallback((el: HTMLElement | null) => {
    headerObserver.current?.disconnect();
    headerObserver.current = null;
    if (!el) {
      document.documentElement.style.setProperty("--app-header-h", "0px");
      return;
    }
    const sync = () =>
      document.documentElement.style.setProperty(
        "--app-header-h",
        `${el.getBoundingClientRect().height}px`
      );
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    headerObserver.current = observer;
  }, []);

  const toggleSection = useCallback((id: string) => {
    setCollapsed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
  const syncText =
    (SYNC_LABEL[syncInfo.status] ?? "동기화 대기") +
    (syncInfo.status === "offline" ? ` ${syncInfo.pendingCount}` : "");
  const displayName = profileName || user?.email || "사용자";

  const headerActions = (
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
  );

  // ── 모바일 UI: 상단 ☰ 드로어 + 하단 탭 ──────────────────────────────
  if (isMobile) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <CommandPalette />
        <ShortcutHelp />

        <header
          ref={headerRef}
          className="sticky top-0 z-30 flex items-center gap-2 border-b border-zinc-200 bg-white/85 px-3 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85"
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="메뉴 열기"
            aria-expanded={drawerOpen}
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
          {headerActions}
        </header>

        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] max-w-[85vw] flex-col border-r border-zinc-200 bg-white shadow-xl transition-[transform,visibility] duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900",
            // 닫혀 있을 때 visibility:hidden — 화면 밖 링크가 탭 순서에 남지 않도록.
            drawerOpen ? "visible translate-x-0" : "invisible -translate-x-full"
          )}
          aria-hidden={!drawerOpen}
        >
          <div className="flex items-start justify-between border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
            <div>
              <h1 className="text-base font-bold">EJU Study</h1>
              <p className="text-xs text-zinc-500">일본 유학 준비</p>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="메뉴 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <NavTree
            sections={navSections}
            pathname={pathname}
            expanded={expanded}
            onToggle={toggleSection}
            onNavigate={() => setDrawerOpen(false)}
          />

          <SidebarFooter
            name={displayName}
            avatarUrl={avatarUrl}
            syncText={syncText}
            onSignOut={() => void signOut()}
          />
        </aside>

        <main className="p-4 pb-[calc(var(--bottom-nav-h)+1.5rem)]">{children}</main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          style={{ height: MOBILE_TAB_HEIGHT }}
        >
          {mobileTabs.map(({ href, label, icon: Icon }) => {
            const isActive = isActiveHref(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px]",
                  isActive ? "text-red-500" : "text-zinc-500"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
          {/* 나머지 화면(보관함·모의고사·설정…)으로 가는 통로.
              좌측 상단 ☰는 휴대폰에서 엄지가 닿지 않아 여기에도 둔다. */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px]",
              drawerOpen ? "text-red-500" : "text-zinc-500"
            )}
            aria-label="메뉴 열기"
            aria-expanded={drawerOpen}
          >
            <Menu className="h-5 w-5" />
            더보기
          </button>
        </nav>
      </div>
    );
  }

  // ── PC UI: 왼쪽 고정 사이드바 ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <CommandPalette />
      <ShortcutHelp />

      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
            <div>
              <h1 className="text-base font-bold">EJU Study</h1>
              <p className="text-xs text-zinc-500">일본 유학 준비</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="사이드바 접기"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <NavTree
            sections={navSections}
            pathname={pathname}
            expanded={expanded}
            onToggle={toggleSection}
            onNavigate={() => {}}
          />

          <SidebarFooter
            name={displayName}
            avatarUrl={avatarUrl}
            syncText={syncText}
            onSignOut={() => void signOut()}
          />
        </aside>
      )}

      <div className={cn("flex min-h-screen flex-col", sidebarOpen && "pl-64")}>
        <header
          ref={headerRef}
          className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white/85 px-4 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85"
        >
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label="사이드바 펼치기"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] leading-tight text-zinc-400">
              {sectionLabel && pageLabel ? sectionLabel : "EJU Study"}
            </p>
            <p className="truncate text-sm font-semibold leading-tight">
              {pageLabel ?? sectionLabel ?? "EJU Study"}
            </p>
          </div>
          {headerActions}
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

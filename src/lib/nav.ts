import {
  BarChart3,
  BookMarked,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  FlaskConical,
  Headphones,
  Home,
  Info,
  Languages,
  Library,
  PenLine,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

/** 단일 링크 섹션(대시보드처럼 하위가 없는 것)과 그룹 섹션을 구분한다. */
export type NavSection =
  | { kind: "link"; id: string; label: string; icon: LucideIcon; href: string }
  | { kind: "group"; id: string; label: string; icon: LucideIcon; items: NavLink[] };

/**
 * 사이드 메뉴 위계.
 *
 * 섹션은 "무엇을 하려는가"(오늘 / 일본어 / 교과목 / 영어 / 시험 / 설정) 기준이고,
 * 기본값은 전부 펼침이다. 접는 기능은 안 쓰는 영역을 치우고 싶을 때만 쓴다 —
 * 처음부터 접어 두면 어디에 뭐가 있는지 몰라서 매번 두 번 눌러 찾아야 했다.
 */
export function buildNavSections(isAdmin: boolean): NavSection[] {
  const settingsItems: NavLink[] = [
    { href: "/guide", label: "EJU 가이드", icon: Info },
    { href: "/profile", label: "프로필", icon: UserCircle2 },
    { href: "/settings", label: "설정", icon: Settings },
  ];
  if (isAdmin) {
    settingsItems.push({ href: "/admin", label: "계정 관리", icon: Shield });
  }

  return [
    { kind: "link", id: "home", label: "대시보드", icon: Home, href: "/" },
    {
      kind: "group",
      id: "today",
      label: "오늘",
      icon: Sparkles,
      items: [
        { href: "/study/today", label: "오늘의 학습", icon: Sparkles },
        { href: "/plan", label: "학습 플랜", icon: ClipboardList },
        { href: "/review", label: "오답노트", icon: RotateCcw },
      ],
    },
    {
      kind: "group",
      id: "japanese",
      label: "일본어",
      icon: Languages,
      items: [
        { href: "/study/japanese", label: "단어 · 문법", icon: Languages },
        { href: "/dictation", label: "딕테이션", icon: Headphones },
        { href: "/writing", label: "기술(작문)", icon: PenLine },
      ],
    },
    {
      kind: "group",
      id: "subjects",
      label: "교과목",
      icon: FlaskConical,
      items: [
        { href: "/study/subjects", label: "과목 학습", icon: FlaskConical },
        { href: "/study/terms", label: "과목 용어", icon: BookMarked },
      ],
    },
    {
      kind: "group",
      id: "english",
      label: "영어",
      icon: BookOpen,
      items: [{ href: "/study/toefl", label: "TOEFL 단어", icon: BookOpen }],
    },
    {
      kind: "group",
      id: "exam",
      label: "시험",
      icon: FileText,
      items: [
        { href: "/mock", label: "모의고사", icon: FileText },
        { href: "/scores", label: "성적", icon: TrendingUp },
        { href: "/stats", label: "약점 분석", icon: BarChart3 },
        { href: "/schedule", label: "일정", icon: Calendar },
      ],
    },
    {
      // 보관함은 "무엇을 공부할지 고르는" 준비 작업이라 학습 항목들과 성격이 다르다.
      // 일본어·교과목 섹션 안에 흩어져 있으면 필요할 때 찾기 어려워 따로 묶었다.
      kind: "group",
      id: "library",
      label: "보관함",
      icon: Library,
      items: [
        { href: "/study/library", label: "단어장 보관함", icon: Library },
        { href: "/study/modules", label: "학습 모듈 보관함", icon: Library },
      ],
    },
    {
      kind: "group",
      id: "settings",
      label: "정보 · 설정",
      icon: Settings,
      items: settingsItems,
    },
  ];
}

/** 그룹 섹션 id 전체 — 메뉴를 처음 열 때 모두 펼쳐 두는 데 쓴다. */
export function allGroupIds(sections: NavSection[]): string[] {
  return sections.filter((s) => s.kind === "group").map((s) => s.id);
}

/**
 * 모바일 하단 탭.
 *
 * 매일 도는 4개만 두고, 마지막 칸은 ☰ 메뉴를 여는 "더보기"로 쓴다(AppShell에서 붙인다).
 * 휴대폰에서 좌측 상단 ☰는 엄지가 닿지 않아, 나머지 화면으로 가려면 손을 옮겨야 했다.
 */
export const mobileTabs: NavLink[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/study/today", label: "오늘", icon: Sparkles },
  { href: "/study/japanese", label: "일본어", icon: Languages },
  { href: "/review", label: "오답", icon: RotateCcw },
];

export function isActiveHref(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 현재 경로가 속한 섹션과 링크를 찾는다(헤더 경로 표시 · 섹션 자동 펼침용). */
export function findActiveNav(
  sections: NavSection[],
  pathname: string
): { section: NavSection; link?: NavLink } | null {
  for (const section of sections) {
    if (section.kind === "link") {
      if (isActiveHref(section.href, pathname)) return { section };
      continue;
    }
    const link = section.items.find((item) => isActiveHref(item.href, pathname));
    if (link) return { section, link };
  }
  return null;
}

/** 커맨드 팔레트를 여는 전역 이벤트(헤더 검색 버튼 ↔ CommandPalette). */
export const OPEN_COMMAND_PALETTE = "eju:open-command-palette";

const TERM_SUBJECTS = new Set(["math", "sogo", "physics", "chemistry", "biology"]);

/** 덱의 과목이 어느 학습 화면에 속하는지. */
export function deckStudyHref(subject: string | undefined): string {
  if (subject === "toefl") return "/study/toefl";
  if (subject && TERM_SUBJECTS.has(subject)) return "/study/terms";
  return "/study/japanese";
}

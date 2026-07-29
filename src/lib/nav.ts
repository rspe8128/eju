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

export type NavLink = { href: string; label: string; desc?: string; icon?: LucideIcon };

/** 단일 링크 섹션(대시보드처럼 하위가 없는 것)과 그룹 섹션을 구분한다. */
export type NavSection =
  | { kind: "link"; id: string; label: string; icon: LucideIcon; href: string }
  | { kind: "group"; id: string; label: string; icon: LucideIcon; items: NavLink[] };

/**
 * 사이드 메뉴 위계.
 *
 * 예전에는 20개 가까운 링크가 4개 묶음으로 평평하게 나열돼 있어서 훑기 힘들었다.
 * 지금은 "무엇을 하려는가"(오늘 / 일본어 / 과목 / 영어 / 시험 / 설정) 기준으로
 * 접을 수 있는 섹션을 만들고, 현재 페이지가 속한 섹션만 펼쳐 보여준다.
 */
export function buildNavSections(isAdmin: boolean): NavSection[] {
  const settingsItems: NavLink[] = [
    { href: "/guide", label: "EJU 가이드", desc: "시험 개요와 공부법", icon: Info },
    { href: "/profile", label: "프로필", desc: "내 정보와 목표", icon: UserCircle2 },
    { href: "/settings", label: "설정", desc: "백업 · 동기화 · 테마", icon: Settings },
  ];
  if (isAdmin) {
    settingsItems.push({
      href: "/admin",
      label: "계정 관리",
      desc: "사용자 권한",
      icon: Shield,
    });
  }

  return [
    { kind: "link", id: "home", label: "대시보드", icon: Home, href: "/" },
    {
      kind: "group",
      id: "today",
      label: "오늘",
      icon: Sparkles,
      items: [
        { href: "/study/today", label: "오늘의 학습", desc: "복습 카드 · 추천 학습", icon: Sparkles },
        { href: "/plan", label: "학습 플랜", desc: "주간 계획", icon: ClipboardList },
        { href: "/review", label: "오답노트", desc: "틀린 문제 다시 풀기", icon: RotateCcw },
      ],
    },
    {
      kind: "group",
      id: "japanese",
      label: "일본어",
      icon: Languages,
      items: [
        { href: "/study/japanese", label: "단어 · 문법", desc: "JLPT 학습", icon: Languages },
        { href: "/study/library", label: "단어장 보관함", desc: "덱 추가 · 관리", icon: Library },
        { href: "/dictation", label: "딕테이션", desc: "듣고 받아쓰기", icon: Headphones },
        { href: "/writing", label: "기술(작문)", desc: "AI 첨삭", icon: PenLine },
      ],
    },
    {
      kind: "group",
      id: "subjects",
      label: "교과목",
      icon: FlaskConical,
      items: [
        { href: "/study/subjects", label: "과목 학습", desc: "종합 · 수학 · 이과", icon: FlaskConical },
        { href: "/study/terms", label: "과목 용어", desc: "일본어 전문 용어", icon: BookMarked },
        { href: "/study/modules", label: "학습 모듈 보관함", desc: "단원 추가 · 관리", icon: Library },
      ],
    },
    {
      kind: "group",
      id: "english",
      label: "영어",
      icon: BookOpen,
      items: [{ href: "/study/toefl", label: "TOEFL 단어", desc: "핵심 어휘", icon: BookOpen }],
    },
    {
      kind: "group",
      id: "exam",
      label: "시험",
      icon: FileText,
      items: [
        { href: "/mock", label: "모의고사", desc: "실전 연습", icon: FileText },
        { href: "/scores", label: "성적", desc: "점수 기록", icon: TrendingUp },
        { href: "/stats", label: "약점 분석", desc: "취약 단원", icon: BarChart3 },
        { href: "/schedule", label: "일정", desc: "시험 · 접수일", icon: Calendar },
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

"use client";

import Link from "next/link";
import {
  Flame,
  Target,
  Calendar,
  AlertCircle,
  BarChart3,
  BookMarked,
  BookOpen,
  Languages,
  PenLine,
  FileText,
  CheckCircle2,
  Circle,
  Library,
  Play,
  ShieldAlert,
} from "lucide-react";
import { getSubjectLabel } from "@/lib/eju";
import {
  useStorage,
  useDueCards,
  useWeekGoals,
  useUnresolvedMistakes,
} from "@/context/StorageContext";
import { daysUntil, todayString } from "@/lib/utils";
import { getSubjectColor } from "@/lib/types";
import { computePlan } from "@/lib/plan";
import { resolveMockMistake } from "@/lib/mock/mistakeIds";
import { StudyHeatmap } from "@/components/study/StudyHeatmap";

/**
 * subject는 아이콘 색을 고르는 데 쓰고, deckSubjects는 "복습 N" 배지를 셀 덱 과목이다.
 * 둘을 한 값으로 쓰면 작문·모의고사처럼 덱이 없는 화면에도 카드 복습 수가 붙는다.
 */
const shortcuts: {
  href: string;
  label: string;
  desc: string;
  icon: typeof Languages;
  subject: string;
  deckSubjects?: string[];
}[] = [
  {
    href: "/study/japanese",
    label: "일본어",
    desc: "JLPT · EJU 독해",
    icon: Languages,
    subject: "japanese",
    deckSubjects: ["japanese"],
  },
  {
    href: "/study/terms",
    label: "과목 용어",
    desc: "수학·이과·종합",
    icon: BookMarked,
    subject: "sogo",
    deckSubjects: ["math", "sogo", "physics", "chemistry", "biology"],
  },
  {
    href: "/study/toefl",
    label: "TOEFL",
    desc: "대학 영어 · EJU 과목 아님",
    icon: BookOpen,
    subject: "toefl",
    deckSubjects: ["toefl"],
  },
  { href: "/writing", label: "기술(작문)", desc: "記述 연습", icon: PenLine, subject: "japanese" },
  { href: "/mock", label: "모의고사", desc: "풀고 바로 채점", icon: FileText, subject: "physics" },
  { href: "/stats", label: "약점 분석", desc: "정답률 · 잔디", icon: BarChart3, subject: "math" },
];

/** 무엇을 공부할지 고르는 준비 화면. 학습 바로가기와 성격이 달라 따로 묶는다. */
const libraryShortcuts = [
  { href: "/study/library", label: "단어장 보관함", desc: "덱 담기 · 빼기" },
  { href: "/study/modules", label: "학습 모듈 보관함", desc: "단원 담기 · 빼기" },
];

export function DashboardView() {
  const { data, syncInfo } = useStorage();
  const dueCards = useDueCards();
  const weekGoals = useWeekGoals();
  const mistakes = useUnresolvedMistakes();
  const plans = computePlan(data);
  const newQuota = plans.reduce((s, p) => s + p.dailyQuota, 0);

  // 지난 일정은 제외하고 가장 가까운 다가올 일정을 고른다
  const upcomingDeadlines = [...data.deadlines]
    .filter((d) => daysUntil(d.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nearestDeadline = upcomingDeadlines[0];

  const recentMistakes = mistakes.slice(0, 5);
  const today = todayString();
  const todayStudied = data.studyLogs
    .filter((l) => l.date === today)
    .reduce((s, l) => s + l.count, 0);
  /** 오늘 뽀모도로로 채운 시간 (약점 분석은 7일 합계라 오늘치는 여기서 따로 센다) */
  const todayMinutes = data.focusSessions
    .filter((s) => s.startedAt.slice(0, 10) === today)
    .reduce((n, s) => n + s.minutes, 0);

  /**
   * 스트릭이 끊기기 직전인지.
   * 어제까지 이어 왔는데 오늘 아직 기록이 없으면 알려 준다 — 앱을 켠 김에 한 장이라도
   * 하면 이어지기 때문이다. 이미 끊긴 뒤(그저께가 마지막)라면 재촉하지 않는다.
   */
  const yesterday = todayString(new Date(Date.now() - 86400000));
  const streakAtRisk =
    data.streak > 0 && data.lastStudyDate === yesterday && todayStudied === 0;

  const todos = [
    {
      id: "due",
      label: `오늘 복습 카드 ${dueCards.length}개`,
      href: "/study/today",
      done: dueCards.length === 0 && todayStudied > 0,
      count: dueCards.length,
    },
    {
      id: "plan",
      label: `플랜 신규 학습 약 ${newQuota}개`,
      href: "/study/today",
      done: todayStudied >= newQuota && newQuota > 0,
      count: newQuota,
    },
    {
      id: "mistakes",
      label: `오답 재도전 ${mistakes.length}개`,
      href: "/review",
      done: mistakes.length === 0,
      count: mistakes.length,
    },
  ];

  const todoDone = todos.filter((t) => t.done).length;
  const todoPct = Math.round((todoDone / todos.length) * 100);
  /** 시작 버튼에 띄울 오늘 세션 분량 (오늘의 학습 화면이 실제로 다루는 카드 수와 같은 기준) */
  const sessionTotal = dueCards.length + newQuota;

  // 기록이 localStorage에만 있으므로, 백업이 오래되면 눈에 띄게 알린다.
  const lastBackup = data.settings.lastBackupAt;
  const backupAgeDays = lastBackup ? -daysUntil(lastBackup) : null;
  const backupStale = (backupAgeDays === null || backupAgeDays > 30) && !syncInfo.loggedIn;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-sm text-zinc-500">오늘도 화이팅!</p>
        </div>
        <Link
          href="/guide"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
        >
          EJU가 뭔지 궁금하다면 →
        </Link>
      </div>

      {streakAtRisk && (
        <Link
          href="/study/today"
          className="flex items-start gap-3 rounded-xl border border-orange-300 bg-orange-50 p-4 transition-colors hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:hover:bg-orange-900/30"
        >
          <Flame className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
              {data.streak}일 연속 · 오늘 아직 기록이 없다
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-orange-800/90 dark:text-orange-300/80">
              오늘 안에 한 장이라도 하면 이어진다. 지금 시작하기 →
            </p>
          </div>
        </Link>
      )}

      {backupStale && (
        <Link
          href="/settings"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {backupAgeDays === null
                ? "아직 한 번도 백업하지 않았다"
                : `마지막 백업이 ${backupAgeDays}일 전이다`}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/80">
              모든 기록이 이 브라우저에만 있다. 브라우저 데이터를 지우면 복구할 수 없다. 설정에서
              백업 파일을 내보내 두자 →
            </p>
          </div>
        </Link>
      )}

      {/* 오늘 해야 할 것과 시작 버튼을 한 카드에 모은다.
          예전에는 할 일 목록과 지표 카드가 같은 숫자(복습·오답)를 두세 번 반복해서
          보여주면서, 정작 "지금 시작" 버튼은 어디에도 없었다. */}
      <section className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-700">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">오늘의 할 일</h2>
          <span className="text-xs text-zinc-500">
            {todoDone}/{todos.length}
          </span>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${todoPct}%` }}
          />
        </div>
        <ul className="space-y-1">
          {todos.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                {t.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-zinc-300" />
                )}
                <span className={`text-sm ${t.done ? "text-zinc-400 line-through" : ""}`}>
                  {t.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href={sessionTotal > 0 ? "/study/today" : "/study/library"}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-red-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
        >
          <Play className="h-4 w-4" />
          {sessionTotal > 0
            ? `오늘의 학습 시작 (${sessionTotal}장)`
            : data.cards.length === 0
              ? "먼저 단어장 담으러 가기"
              : "오늘 몫 완료 · 더 학습하기"}
        </Link>
      </section>

      {/* 지표는 숫자만 크게 띄우는 대신, 눌러서 해당 화면으로 가는 한 줄 칩으로. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label="연속 학습"
          value={`${data.streak}일`}
          href="/stats"
        />
        <StatChip
          icon={<BookOpen className="h-4 w-4 text-blue-500" />}
          label="오늘 학습"
          value={todayMinutes > 0 ? `${todayStudied}장 · ${todayMinutes}분` : `${todayStudied}장`}
          href="/stats"
        />
        <StatChip
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          label="미해결 오답"
          value={`${mistakes.length}개`}
          href="/review"
        />
        <StatChip
          icon={<Calendar className="h-4 w-4 text-purple-500" />}
          label={nearestDeadline?.label ?? "다가올 일정"}
          value={nearestDeadline ? `D-${daysUntil(nearestDeadline.date)}` : "없음"}
          href="/schedule"
        />
      </div>

      {weekGoals.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Target className="h-5 w-5" />
            이번 주 목표
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {weekGoals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentCount / goal.targetCount) * 100));
              const color = getSubjectColor(goal.subjectId, data.subjects);
              return (
                <div
                  key={goal.id}
                  className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">{getSubjectLabel(goal.subjectId)}</span>
                    <span className="text-zinc-500">
                      {goal.currentCount} / {goal.targetCount}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">바로가기</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map(({ href, label, desc, icon: Icon, subject: sub, deckSubjects }) => {
            const dueForSubject = deckSubjects
              ? dueCards.filter((c) => {
                  const deck = data.decks.find((d) => d.id === c.deckId);
                  return deck ? deckSubjects.includes(deck.subject) : false;
                }).length
              : 0;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: getSubjectColor(sub, data.subjects) }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{label}</span>
                    {dueForSubject > 0 && (
                      <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                        복습 {dueForSubject}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-zinc-500">{desc}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {libraryShortcuts.map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                <Library className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{label}</p>
                <p className="truncate text-xs text-zinc-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <StudyHeatmap />

      {recentMistakes.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">최근 오답</h2>
            <Link href="/review" className="text-sm text-blue-600 hover:underline">
              전체 보기
            </Link>
          </div>
          <div className="space-y-2">
            {recentMistakes.map((m) => {
              const card =
                m.sourceType === "card" ? data.cards.find((c) => c.id === m.sourceId) : null;
              const problem =
                m.sourceType === "problem" ? data.items.find((i) => i.id === m.sourceId) : null;
              const mock = m.sourceType === "mock" ? resolveMockMistake(m.sourceId) : null;
              const label = mock
                ? `${mock.paper.title} ${mock.question.number}번`
                : (card?.front ?? (problem?.type === "problem" ? problem.title : "알 수 없음"));
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700"
                >
                  <span className="min-w-0 truncate text-sm">{label}</span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {m.sourceType === "card" ? "카드" : m.sourceType === "mock" ? "모의고사" : "문제"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] text-zinc-500">{label}</span>
        <span className="block truncate text-base font-bold leading-tight">{value}</span>
      </span>
    </Link>
  );
}

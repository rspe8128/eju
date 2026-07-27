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
} from "lucide-react";
import { getSubjectLabel } from "@/lib/eju";
import {
  useStorage,
  useDueCards,
  useWeekGoals,
  useUnresolvedMistakes,
} from "@/context/StorageContext";
import { daysUntil } from "@/lib/utils";
import { getSubjectColor } from "@/lib/types";
import { computePlan } from "@/lib/plan";
import { StudyHeatmap } from "@/components/study/StudyHeatmap";

const shortcuts = [
  { href: "/study/japanese", label: "일본어", desc: "JLPT · EJU 독해", icon: Languages, subject: "japanese" },
  { href: "/study/terms", label: "과목 용어", desc: "수학·이과·종합", icon: BookMarked, subject: "sogo" },
  {
    href: "/study/toefl",
    label: "TOEFL",
    desc: "대학 영어 · EJU 과목 아님",
    icon: BookOpen,
    subject: "toefl",
  },
  { href: "/writing", label: "기술(작문)", desc: "記述 연습", icon: PenLine, subject: "japanese" },
  { href: "/mock", label: "모의고사", desc: "풀고 바로 채점", icon: FileText, subject: "physics" },
  { href: "/stats", label: "약점 분석", desc: "정답률 · 잔디", icon: BarChart3, subject: "math" },
];

export function DashboardView() {
  const { data } = useStorage();
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
  const todayStudied = data.studyLogs
    .filter((l) => l.date === new Date().toISOString().split("T")[0])
    .reduce((s, l) => s + l.count, 0);

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

      <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">오늘의 할 일</h2>
          <span className="text-xs text-zinc-500">{todoDone}/{todos.length}</span>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${todoPct}%` }} />
        </div>
        <ul className="space-y-2">
          {todos.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                {t.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-zinc-300" />
                )}
                <span className={`text-sm ${t.done ? "text-zinc-400 line-through" : ""}`}>
                  {t.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-blue-500" />}
          label="오늘 복습"
          value={`${dueCards.length}장`}
          sub="간격 반복 대상"
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          label="연속 학습"
          value={`${data.streak}일`}
          sub="스트릭"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-purple-500" />}
          label={nearestDeadline?.label ?? "D-day"}
          value={nearestDeadline ? `D-${daysUntil(nearestDeadline.date)}` : "-"}
          sub={nearestDeadline ? nearestDeadline.date : "다가올 일정 없음"}
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          label="오답"
          value={`${mistakes.length}개`}
          sub="미해결"
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
          {shortcuts.map(({ href, label, desc, icon: Icon, subject: sub }) => {
            const dueForSubject = dueCards.filter((c) => {
              const deck = data.decks.find((d) => d.id === c.deckId);
              return deck?.subject === sub;
            }).length;
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
              const label =
                card?.front ?? (problem?.type === "problem" ? problem.title : "알 수 없음");
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700"
                >
                  <span className="text-sm">{label}</span>
                  <span className="text-xs text-zinc-400">
                    {m.sourceType === "card" ? "카드" : "문제"}
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

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-2">{icon}</div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-zinc-400">{sub}</p>
    </div>
  );
}

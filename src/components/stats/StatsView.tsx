"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { AlertTriangle, Clock, Target, TrendingUp } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import {
  getDeckStats,
  getWeakCards,
  getDailyStats,
  getSubjectStats,
  getFocusMinutes,
  getTotalStudied,
} from "@/lib/stats";
import { MASTERY_COLORS, MASTERY_LABELS, type MasteryLevel } from "@/lib/progress";
import { getSubjectColor } from "@/lib/types";
import { getSubjectLabel } from "@/lib/eju";
import { StudyHeatmap } from "@/components/study/StudyHeatmap";
import { ExamWeaknessSection } from "./ExamWeaknessSection";

const MASTERY_ORDER: MasteryLevel[] = ["new", "learning", "review", "mastered"];

function accuracyColor(acc: number | null): string {
  if (acc === null) return "text-zinc-400";
  if (acc >= 85) return "text-green-600 dark:text-green-400";
  if (acc >= 65) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function StatsView() {
  const { data } = useStorage();

  const deckStats = useMemo(() => getDeckStats(data), [data]);
  const weakCards = useMemo(() => getWeakCards(data, 10), [data]);
  const daily = useMemo(() => getDailyStats(data, 14), [data]);
  const subjectStats = useMemo(() => getSubjectStats(data), [data]);
  const focusMinutes = getFocusMinutes(data, 7);
  const totalStudied = getTotalStudied(data);

  const weakestDecks = [...deckStats]
    .filter((d) => d.accuracy !== null)
    .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">약점 분석</h1>
        <p className="mt-1 text-sm text-zinc-500">
          어디서 새고 있는지 확인하고, 오늘 그것부터 잡자.
        </p>
      </header>

      <ExamWeaknessSection />

      {/* 요약 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Target className="h-4 w-4" />}
          label="누적 학습"
          value={`${totalStudied}회`}
        />
        <SummaryCard
          icon={<Clock className="h-4 w-4" />}
          label="최근 7일 집중"
          value={`${focusMinutes}분`}
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="연속 학습"
          value={`${data.streak}일`}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="미해결 오답"
          value={`${data.mistakes.filter((m) => !m.resolved).length}개`}
        />
      </div>

      {/* 취약 덱 하이라이트 */}
      {weakestDecks.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-900/10">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            정답률이 가장 낮은 덱
          </h2>
          <div className="space-y-2">
            {weakestDecks.map((s) => (
              <div key={s.deck.id} className="flex items-center justify-between text-sm">
                <span>{s.deck.title}</span>
                <span className={accuracyColor(s.accuracy)}>{s.accuracy}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 최근 14일 학습량 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">최근 14일 학습량</h2>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#a1a1aa" />
              <YAxis tick={{ fontSize: 11 }} stroke="#a1a1aa" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
                formatter={(v) => [`${Number(v ?? 0)}회`, "학습"] as [string, string]}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 학습 잔디 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">학습 기록</h2>
        <StudyHeatmap />
      </section>

      {/* 과목별 정답률 */}
      {subjectStats.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">과목별 현황</h2>
          <div className="space-y-2">
            {subjectStats.map((s) => (
              <div
                key={s.subjectId}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getSubjectColor(s.subjectId, data.subjects) }}
                  />
                  <span className="font-medium">{getSubjectLabel(s.subjectId)}</span>
                </div>
                <div className="flex items-center gap-4 text-zinc-500">
                  <span>{s.count}회</span>
                  <span className={accuracyColor(s.accuracy)}>
                    {s.accuracy === null ? "-" : `${s.accuracy}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 덱별 숙련도 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">덱별 숙련도</h2>
        <div className="space-y-3">
          {deckStats.map((s) => {
            const total = s.total || 1;
            return (
              <div
                key={s.deck.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.deck.title}</span>
                  <span className="text-zinc-500">
                    {s.studied}/{s.total}
                    {s.accuracy !== null && (
                      <span className={`ml-3 ${accuracyColor(s.accuracy)}`}>{s.accuracy}%</span>
                    )}
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                  {MASTERY_ORDER.map((level) => {
                    const count = s.mastery[level];
                    if (count === 0) return null;
                    return (
                      <div
                        key={level}
                        style={{
                          width: `${(count / total) * 100}%`,
                          backgroundColor: MASTERY_COLORS[level],
                        }}
                        title={`${MASTERY_LABELS[level]} ${count}개`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
          {MASTERY_ORDER.map((level) => (
            <span key={level} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: MASTERY_COLORS[level] }}
              />
              {MASTERY_LABELS[level]}
            </span>
          ))}
        </div>
      </section>

      {/* 자주 틀리는 카드 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">자주 틀리는 카드 TOP 10</h2>
        {weakCards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            아직 오답 데이터가 없어요. 학습을 시작하면 여기에 쌓입니다.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800">
                <tr>
                  <th className="px-4 py-2 text-left">카드</th>
                  <th className="px-4 py-2 text-left">덱</th>
                  <th className="px-4 py-2 text-right">틀린 횟수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {weakCards.map((c) => (
                  <tr key={c.id} className="bg-white dark:bg-zinc-900/40">
                    <td className="px-4 py-3">
                      <span className="font-medium">{c.front}</span>
                      <span className="ml-2 text-zinc-500">{c.back}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{c.deckTitle}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-500">
                      {c.srs.lapses ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

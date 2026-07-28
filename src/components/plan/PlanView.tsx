"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import {
  computePlan,
  computeSubjectProgress,
  daysDiff,
  estimateCompletionDate,
} from "@/lib/plan";
import { daysUntil, formatDate, todayString } from "@/lib/utils";
import { StudyHeatmap } from "@/components/study/StudyHeatmap";

export function PlanView() {
  const { data, addPlanTarget, updatePlanTarget, removePlanTarget } = useStorage();
  const examDate = data.examProfile?.examDate ?? "2028-11-12";
  const plans = useMemo(() => computePlan(data, examDate), [data, examDate]);

  const [kind, setKind] = useState<"deck" | "subject">("deck");
  const [refId, setRefId] = useState("");
  const [dueDate, setDueDate] = useState(examDate);
  const [quotaMode, setQuotaMode] = useState<"auto" | "manual">("manual");
  const [dailyQuota, setDailyQuota] = useState(20);

  const totalUnits = plans.reduce((s, p) => s + p.totalUnits, 0);
  const completed = plans.reduce((s, p) => s + p.completedUnits, 0);
  const overallPct = totalUnits ? Math.round((completed / totalUnits) * 100) : 0;

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });

  const subjects = Array.from(new Set(data.studyLogs.map((l) => l.subjectId)));
  const barData = last14.map((date) => {
    const row: Record<string, string | number> = {
      date: new Date(date + "T00:00:00").toLocaleDateString("ko-KR", {
        month: "numeric",
        day: "numeric",
      }),
    };
    for (const s of subjects) {
      row[s] = data.studyLogs
        .filter((l) => l.date === date && l.subjectId === s)
        .reduce((sum, l) => sum + l.count, 0);
    }
    return row;
  });

  const handleAdd = () => {
    if (!refId) return;
    addPlanTarget({ kind, refId, dueDate, quotaMode, dailyQuota });
    setRefId("");
  };

  /** 선택한 덱·과목의 전체 개수 — 하루 몇 개로 잡을지 감을 주기 위해 미리 보여준다 */
  const previewTotal = refId
    ? kind === "deck"
      ? data.cards.filter((c) => c.deckId === refId).length
      : computeSubjectProgress(data, refId).total
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">학습 플랜</h1>
        <p className="text-sm text-zinc-500">시험일까지 자동 할당량 · 진도 예측</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">시험 D-day</p>
          <p className="text-3xl font-bold text-purple-600">
            D{daysUntil(examDate) >= 0 ? "-" : "+"}
            {Math.abs(daysUntil(examDate))}
          </p>
          <p className="text-xs text-zinc-400">{formatDate(examDate)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">전체 진행률</p>
          <div className="relative mx-auto mt-2 h-24 w-24">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e4e4e7" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="3"
                strokeDasharray={`${overallPct} ${100 - overallPct}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
              {overallPct}%
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">완료 / 전체</p>
          <p className="text-3xl font-bold">
            {completed}
            <span className="text-lg text-zinc-400"> / {totalUnits}</span>
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">목표별 진도</h2>
        {plans.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            목표가 없습니다. 아래에서 추가하세요.
          </div>
        )}
        {plans.map((p) => {
          const remaining = Math.max(0, p.totalUnits - p.completedUnits);
          const pct = p.totalUnits
            ? Math.round((p.completedUnits / p.totalUnits) * 100)
            : 0;
          const eta = estimateCompletionDate(
            remaining,
            Math.max(1, p.dailyQuota),
            data.settings.excludeWeekends
          );
          const delay = daysDiff(p.dueDate, eta);
          const behind = delay > 0;
          const catchUp = behind
            ? Math.ceil(
                remaining /
                  Math.max(
                    1,
                    daysDiff(todayString(), p.dueDate) -
                      (data.settings.excludeWeekends ? Math.floor(daysDiff(todayString(), p.dueDate) * 2 / 7) : 0)
                  )
              )
            : p.dailyQuota;

          const name =
            p.kind === "deck"
              ? data.decks.find((d) => d.id === p.refId)?.title ?? p.refId
              : data.subjects.find((s) => s.id === p.refId)?.name ?? p.refId;

          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 ${
                behind
                  ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-900/10"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-zinc-500">
                    기한 {p.dueDate} · 하루 {p.dailyQuota}개 · 예상 완료 {eta}
                    {behind && (
                      <span className="ml-1 font-medium text-red-600">
                        (목표보다 {delay}일 지연 · 따라잡으려면 하루 {catchUp}개)
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => removePlanTarget(p.id)}
                  className="text-zinc-400 hover:text-red-500"
                  aria-label="목표 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>
                  {p.completedUnits} / {p.totalUnits}
                </span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${behind ? "bg-red-500" : "bg-purple-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={p.dueDate}
                  onChange={(e) => updatePlanTarget(p.id, { dueDate: e.target.value })}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                />
                <select
                  value={p.quotaMode ?? "auto"}
                  onChange={(e) =>
                    updatePlanTarget(p.id, {
                      quotaMode: e.target.value as "auto" | "manual",
                      // 자동 → 직접으로 바꿀 때, 지금 값이 1이면 그대로 두면 의미가 없다.
                      // 바로 손댈 수 있게 쓸 만한 기본값을 넣어 준다.
                      ...(e.target.value === "manual" && p.dailyQuota <= 1
                        ? { dailyQuota: 20 }
                        : {}),
                    })
                  }
                  className="rounded border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="auto">자동</option>
                  <option value="manual">직접</option>
                </select>
                {(p.quotaMode ?? "auto") === "manual" && (
                  <label className="flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                    하루
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={p.dailyQuota}
                      onChange={(e) =>
                        updatePlanTarget(p.id, {
                          dailyQuota: Math.max(1, Math.min(500, parseInt(e.target.value) || 1)),
                        })
                      }
                      className="w-14 bg-transparent text-right outline-none"
                    />
                    개
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="mb-3 text-sm font-semibold">목표 추가</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as "deck" | "subject");
              setRefId("");
            }}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="deck">덱</option>
            <option value="subject">교과목</option>
          </select>
          <select
            value={refId}
            onChange={(e) => setRefId(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">선택...</option>
            {kind === "deck"
              ? data.decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))
              : data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <select
            value={quotaMode}
            onChange={(e) => setQuotaMode(e.target.value as "auto" | "manual")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="manual">하루 개수 직접 정하기</option>
            <option value="auto">기한에 맞춰 자동</option>
          </select>
          {quotaMode === "manual" && (
            <label className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800">
              하루
              <input
                type="number"
                min={1}
                max={500}
                value={dailyQuota}
                onChange={(e) =>
                  setDailyQuota(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))
                }
                className="w-16 bg-transparent text-right outline-none"
              />
              개
            </label>
          )}
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
        {refId && (
          <p className="mt-2 text-xs text-zinc-500">
            전체 {previewTotal.toLocaleString()}개
            {quotaMode === "manual" && dailyQuota > 0 && previewTotal > 0 && (
              <> · 하루 {dailyQuota}개면 평일 기준 약 {Math.ceil(previewTotal / dailyQuota)}일 걸린다</>
            )}
            {quotaMode === "auto" && (
              <> · 기한까지 남은 평일로 나눠서 자동 계산된다</>
            )}
          </p>
        )}
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
          시험일이 멀면 자동 계산은 하루 1개로 나온다(574개를 700일로 나누므로). 실제로
          끝내려면 <b>직접 정하기</b>로 하루 분량을 잡는 편이 낫다.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">최근 14일 학습량</h2>
        <div className="h-52 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              {subjects.map((s, i) => (
                <Bar
                  key={s}
                  dataKey={s}
                  stackId="a"
                  fill={["#ef4444", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"][i % 5]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <StudyHeatmap />
    </div>
  );
}

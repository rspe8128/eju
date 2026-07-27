"use client";

import { useState } from "react";
import { Plus, Trash2, Flame } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useStorage, useWeekGoals } from "@/context/StorageContext";
import { daysUntil, formatDate, getWeekStart } from "@/lib/utils";
import { getSubjectColor } from "@/lib/types";

export function ScheduleView() {
  const { data, addDeadline, removeDeadline, setGoal } = useStorage();
  const weekGoals = useWeekGoals();
  const [newLabel, setNewLabel] = useState("");
  const [newDate, setNewDate] = useState("");

  const sortedDeadlines = [...data.deadlines].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const chartData = last7Days.map((date) => {
    const logs = data.studyLogs.filter((l) => l.date === date);
    const total = logs.reduce((sum, l) => sum + l.count, 0);
    const label = new Date(date + "T00:00:00").toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
    return { date: label, count: total };
  });

  const handleAddDeadline = () => {
    if (!newLabel || !newDate) return;
    addDeadline(newLabel, newDate);
    setNewLabel("");
    setNewDate("");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">일정 · 진도</h1>
        <p className="text-sm text-zinc-500">D-day, 목표, 학습 기록</p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-900/20">
        <Flame className="h-8 w-8 text-orange-500" />
        <div>
          <p className="text-2xl font-bold">{data.streak}일 연속</p>
          <p className="text-sm text-zinc-500">학습 스트릭</p>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">D-day</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {sortedDeadlines.map((d) => {
            const days = daysUntil(d.date);
            return (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div>
                  <p className="font-semibold">{d.label}</p>
                  <p className="text-sm text-zinc-500">{formatDate(d.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">
                    D{days >= 0 ? "-" : "+"}
                    {Math.abs(days)}
                  </p>
                </div>
                <button
                  onClick={() => removeDeadline(d.id)}
                  className="ml-2 rounded p-1 text-zinc-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="일정 이름"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            onClick={handleAddDeadline}
            className="flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">주간 학습량</h2>
        <div className="h-48 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">이번 주 목표</h2>
        <div className="space-y-3">
          {["japanese", "toefl"].map((subjectId) => {
            const goal = weekGoals.find((g) => g.subjectId === subjectId);
            const color = getSubjectColor(subjectId, data.subjects);
            return (
              <div
                key={subjectId}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <span className="w-20 text-sm font-medium">{subjectId}</span>
                <input
                  type="number"
                  min={1}
                  defaultValue={goal?.targetCount ?? 30}
                  onBlur={(e) => setGoal(subjectId, parseInt(e.target.value) || 30)}
                  className="w-20 rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, ((goal?.currentCount ?? 0) / (goal?.targetCount ?? 30)) * 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm text-zinc-500">
                  {goal?.currentCount ?? 0} / {goal?.targetCount ?? 30}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-400">주 시작: {getWeekStart()}</p>
      </section>
    </div>
  );
}

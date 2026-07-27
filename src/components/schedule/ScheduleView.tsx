"use client";

import { useState } from "react";
import { Plus, Trash2, Flame, ExternalLink, AlertCircle, CalendarClock } from "lucide-react";
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
import { daysUntil, formatDate, getWeekStart, cn } from "@/lib/utils";
import { getSubjectColor } from "@/lib/types";
import {
  JLPT_EXAM_TIMES,
  JLPT_ID_NOTE,
  JLPT_INFO_URL,
  JLPT_REGIONS,
  JLPT_URL,
  jlptStatus,
  upcomingJlpt,
} from "@/lib/data/jlptSchedule";

/** JLPT(한국) 시험일 · 접수 기간 · 마감 D-day */
function JlptSection() {
  const sessions = upcomingJlpt();

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">JLPT 일정 (한국)</h2>
        <a
          href={JLPT_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          jlpt.or.kr
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-700">
          예정된 회차가 없다. 공식 사이트에서 다음 일정을 확인하자.
        </p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const status = jlptStatus(s);
            const dday = daysUntil(s.examDate);

            const badge =
              status.kind === "open"
                ? {
                    text: `접수 중 · 마감 D-${status.daysToClose}`,
                    cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                  }
                : status.kind === "late-open"
                  ? {
                      text: `추가접수 중 · D-${status.daysToClose}`,
                      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                    }
                  : status.kind === "before-open"
                    ? {
                        text: `접수 시작 D-${status.daysToOpen}`,
                        cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                      }
                    : {
                        text: "접수 마감",
                        cls: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                      };

            return (
              <div
                key={s.id}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{s.label}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", badge.cls)}>
                        {badge.text}
                      </span>
                      {!s.confirmed && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800">
                          추정
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{formatDate(s.examDate)}</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    D{dday >= 0 ? "-" : "+"}
                    {Math.abs(dday)}
                  </p>
                </div>

                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-zinc-400">일반접수</dt>
                    <dd className="font-medium">
                      {formatDate(s.regular.start)} ~ {formatDate(s.regular.end)}
                    </dd>
                  </div>
                  {s.late && (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-zinc-400">추가접수</dt>
                      <dd className="font-medium">
                        {formatDate(s.late.start)} ~ {formatDate(s.late.end)}
                        <span className="ml-1 text-zinc-400">(+10%)</span>
                      </dd>
                    </div>
                  )}
                  {s.voucherFrom && (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-zinc-400">수험표</dt>
                      <dd className="font-medium">{formatDate(s.voucherFrom)}부터</dd>
                    </div>
                  )}
                  {s.resultDate && (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-zinc-400">성적발표</dt>
                      <dd className="font-medium">{formatDate(s.resultDate)} 무렵</dd>
                    </div>
                  )}
                </dl>

                {s.note && (
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-zinc-500">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    {s.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-zinc-50 p-4 text-xs dark:bg-zinc-800/50">
          <p className="mb-2 flex items-center gap-1.5 font-semibold">
            <CalendarClock className="h-3.5 w-3.5" />
            시험 당일
          </p>
          <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
            {JLPT_EXAM_TIMES.map((t) => (
              <li key={t.levels}>
                · {t.levels} — {t.enter}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-zinc-500">{JLPT_ID_NOTE}</p>
        </div>

        <div className="rounded-xl bg-zinc-50 p-4 text-xs dark:bg-zinc-800/50">
          <p className="mb-2 font-semibold">실시 지역</p>
          <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
            {JLPT_REGIONS.map((r) => (
              <li key={r.area}>
                · <strong>{r.area}</strong> {r.cities}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        “추정”으로 표시된 회차는 예년 패턴(7월·12월 첫째 일요일, 접수는 시험 3개월 전 시작) 기반이다.{" "}
        <a href={JLPT_INFO_URL} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          공식 시험실시안내
        </a>
        에서 확정 일정이 올라오면 갱신할 것. 인기 시험장은 선착순으로 접수 첫날 마감되니 접수
        시작일에 바로 넣는 게 안전하다.
      </p>
    </section>
  );
}

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

      <JlptSection />

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

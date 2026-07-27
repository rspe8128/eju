"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Trash2 } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import {
  EJU_SUBJECTS,
  getActiveSubjectCodes,
  getMaxScore,
  getSubjectLabel,
  sumScores,
} from "@/lib/eju";

const CHART_COLORS = ["#ef4444", "#8b5cf6", "#f59e0b", "#06b6d4", "#10b981", "#3b82f6", "#84cc16"];

export function ScoresView() {
  const { data, addExamRecord, removeExamRecord } = useStorage();
  const profile = data.examProfile!;
  const activeCodes = getActiveSubjectCodes(profile);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [kind, setKind] = useState<"mock" | "real">("mock");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [memo, setMemo] = useState("");

  const latest = [...data.examRecords].sort((a, b) => b.date.localeCompare(a.date))[0];

  const chartData = useMemo(() => {
    return [...data.examRecords]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({
        date: r.date,
        total: sumScores(r.scores, activeCodes),
        ...r.scores,
      }));
  }, [data.examRecords, activeCodes]);

  const handleAdd = () => {
    addExamRecord({ date, kind, scores, memo: memo || undefined });
    setScores({});
    setMemo("");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">성적 트래킹</h1>
        <p className="text-sm text-zinc-500">모의·실전 점수와 목표 대비 진행</p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">목표 대비 최근 점수</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {activeCodes.map((code) => {
            const target = profile.targetScores[code] ?? 0;
            const current = latest?.scores[code] ?? 0;
            const max = getMaxScore(code);
            const pct = max ? Math.min(100, Math.round((current / max) * 100)) : 0;
            const targetPct = max ? Math.min(100, Math.round((target / max) * 100)) : 0;
            return (
              <div
                key={code}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium">{getSubjectLabel(code)}</span>
                  <span className="text-zinc-500">
                    {current} / 목표 {target} (만점 {max})
                  </span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-blue-500"
                    style={{ width: `${pct}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-red-500"
                    style={{ left: `${targetPct}%` }}
                    title={`목표 ${target}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {chartData.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">회차별 점수 추이</h2>
          <div className="h-64 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {activeCodes.map((code, i) => (
                  <Line
                    key={code}
                    type="monotone"
                    dataKey={code}
                    name={getSubjectLabel(code)}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 h-48 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <p className="mb-2 text-sm font-medium">총점 추이</p>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" name="총점" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h2 className="mb-4 text-lg font-semibold">시험 기록 추가</h2>
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "mock" | "real")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="mock">모의</option>
            <option value="real">실전</option>
          </select>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {activeCodes.map((code) => (
            <label key={code} className="flex flex-col gap-1 text-sm">
              {getSubjectLabel(code)}
              <input
                type="number"
                min={0}
                max={getMaxScore(code)}
                value={scores[code] ?? ""}
                onChange={(e) =>
                  setScores((s) => ({ ...s, [code]: parseInt(e.target.value) || 0 }))
                }
                className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm">
            일본어 기술 (별도)
            <input
              type="number"
              min={0}
              max={50}
              value={scores.japaneseWriting ?? ""}
              onChange={(e) =>
                setScores((s) => ({ ...s, japaneseWriting: parseInt(e.target.value) || 0 }))
              }
              className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>
        </div>
        <input
          type="text"
          placeholder="메모 (선택)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="mb-4 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        <button
          onClick={handleAdd}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          기록 추가
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">기록 목록</h2>
        {data.examRecords.length === 0 ? (
          <p className="text-sm text-zinc-500">아직 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {[...data.examRecords]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {r.date} · {r.kind === "mock" ? "모의" : "실전"} · 총점{" "}
                      {sumScores(r.scores, activeCodes)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {Object.entries(r.scores)
                        .map(([k, v]) => `${getSubjectLabel(k)} ${v}`)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    onClick={() => removeExamRecord(r.id)}
                    className="p-1 text-zinc-400 hover:text-red-500"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>

      <p className="text-xs text-zinc-400">
        시험 프로필의 선택 과목: {activeCodes.map(getSubjectLabel).join(", ")} ·{" "}
        {Object.keys(EJU_SUBJECTS).length}개 과목 정의됨
      </p>
    </div>
  );
}

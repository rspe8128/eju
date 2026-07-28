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
import { ChevronDown, Info, PencilLine, Sparkles, Trash2 } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import {
  EJU_SUBJECTS,
  getActiveSubjectCodes,
  getMaxScore,
  getSubjectLabel,
  sumScores,
} from "@/lib/eju";
import { estimateSectionScore, mergeScoreSeries, splitAttemptKey } from "@/lib/mock/scoreEstimate";
import { getMockSection } from "@/lib/mock/registry";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#ef4444", "#8b5cf6", "#f59e0b", "#06b6d4", "#10b981", "#3b82f6", "#84cc16"];

type DotProps = {
  cx?: number;
  cy?: number;
  stroke?: string;
  payload?: { source?: string };
};

/**
 * 손으로 넣은 기록은 ●, 모의고사 자동 환산은 ■.
 * 추이 위에서 "이 점은 추정값"인지 바로 구분되게 하려는 것이다.
 */
function SourceDot({ cx, cy, stroke, payload }: DotProps) {
  if (cx === undefined || cy === undefined) return <g />;
  if (payload?.source === "mock-auto") {
    return (
      <rect
        x={cx - 3.5}
        y={cy - 3.5}
        width={7}
        height={7}
        fill="#fff"
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }
  return <circle cx={cx} cy={cy} r={3} fill={stroke} />;
}

export function ScoresView() {
  const { data, addExamRecord, removeExamRecord } = useStorage();
  const profile = data.examProfile!;
  const activeCodes = getActiveSubjectCodes(profile);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [kind, setKind] = useState<"mock" | "real">("mock");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [memo, setMemo] = useState("");
  const [attemptsOpen, setAttemptsOpen] = useState(false);

  /**
   * 손으로 넣은 기록 + 모의고사 채점 자동 환산을 하나의 추이로 합친다.
   * 같은 회차를 여러 번 풀었으면 buildAutoMockRecords가 이미 최신 것만 남겼으므로,
   * 나머지 응시 기록은 아래 "응시 기록 전체"에 접어 둔다.
   */
  const series = useMemo(
    () => mergeScoreSeries(data.examRecords, data.examAttempts),
    [data.examRecords, data.examAttempts]
  );

  const latest = [...series].sort((a, b) => b.date.localeCompare(a.date))[0];

  const chartData = useMemo(
    () =>
      series.map((r) => ({
        date: r.date,
        source: r.source ?? "manual",
        total: sumScores(r.scores, activeCodes),
        ...r.scores,
      })),
    [series, activeCodes]
  );

  /** 접어 두는 목록 — 회차·섹션별 개별 응시 기록과 그 환산값 */
  const attemptRows = useMemo(
    () =>
      [...data.examAttempts]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((a) => {
          const split = splitAttemptKey(a.paperId);
          const hit = split ? getMockSection(split.paperId, split.sectionId) : undefined;
          const est = split
            ? estimateSectionScore(a.subjectCode, split.sectionId, a.correctCount, a.totalCount)
            : null;
          return {
            id: a.id,
            date: a.date,
            label: hit ? `${hit.paper.title} · ${hit.section.label}` : a.paperId,
            correct: a.correctCount,
            total: a.totalCount,
            est,
          };
        }),
    [data.examAttempts]
  );

  const autoCount = series.filter((r) => r.source === "mock-auto").length;

  const handleAdd = () => {
    addExamRecord({ date, kind, scores, memo: memo || undefined, source: "manual" });
    setScores({});
    setMemo("");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">성적 트래킹</h1>
        <p className="text-sm text-zinc-500">모의·실전 점수와 목표 대비 진행</p>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs leading-relaxed text-blue-900 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          모의고사를 채점하면 정답률 × 만점으로 <strong>환산한 추정 점수</strong>가 이 화면에
          자동으로 들어온다({autoCount}건). JASSO는 문항별 배점과 등화(scaling) 방식을 공개하지
          않으므로 실제 점수와는 차이가 난다. 추세를 보는 용도로만 쓰고, 절대값을 믿지는 말자.
          같은 회차를 여러 번 풀면 가장 최근 것만 추이에 들어간다.
        </span>
      </p>

      <section>
        <h2 className="mb-4 text-lg font-semibold">목표 대비 최근 점수</h2>
        {latest && (
          <p className="mb-3 flex items-center gap-1.5 text-xs text-zinc-500">
            {latest.source === "mock-auto" ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                {latest.date} 모의고사 자동 환산(추정) 기준
              </>
            ) : (
              <>
                <PencilLine className="h-3.5 w-3.5 text-blue-500" />
                {latest.date} 직접 입력한 기록 기준
              </>
            )}
          </p>
        )}
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
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      latest?.source === "mock-auto" ? "bg-violet-500" : "bg-blue-500"
                    )}
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
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">회차별 점수 추이</h2>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-zinc-500" />
                직접 입력
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 border-2 border-zinc-500 bg-white dark:bg-zinc-900" />
                모의고사 자동(추정)
              </span>
            </div>
          </div>
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
                    dot={<SourceDot />}
                    connectNulls
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
                <Line
                  type="monotone"
                  dataKey="total"
                  name="총점"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={<SourceDot />}
                />
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
        {series.length === 0 ? (
          <p className="text-sm text-zinc-500">아직 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {[...series]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((r) => {
                const auto = r.source === "mock-auto";
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border px-4 py-3",
                      auto
                        ? "border-violet-200 bg-violet-50/50 dark:border-violet-900/60 dark:bg-violet-900/10"
                        : "border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                        {auto ? (
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                        ) : (
                          <PencilLine className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                        )}
                        {r.date}
                        <span className="text-zinc-400">·</span>
                        {auto ? (
                          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                            모의 자동 · 추정
                          </span>
                        ) : (
                          <span className="text-zinc-500">
                            {r.kind === "mock" ? "모의" : "실전"} · 직접 입력
                          </span>
                        )}
                        <span className="text-zinc-400">·</span>
                        총점 {sumScores(r.scores, activeCodes)}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {Object.entries(r.scores)
                          .map(([k, v]) => `${getSubjectLabel(k)} ${v}`)
                          .join(" · ")}
                      </p>
                      {r.memo && (
                        <p className="mt-0.5 truncate text-xs text-zinc-400">{r.memo}</p>
                      )}
                    </div>
                    {auto ? (
                      <span className="shrink-0 text-[11px] text-zinc-400">자동</span>
                    ) : (
                      <button
                        onClick={() => removeExamRecord(r.id)}
                        className="shrink-0 p-1 text-zinc-400 hover:text-red-500"
                        aria-label="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {attemptRows.length > 0 && (
        <section>
          <button
            onClick={() => setAttemptsOpen((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", attemptsOpen && "rotate-180")}
            />
            모의고사 응시 기록 전체 {attemptRows.length}건
            <span className="font-normal text-zinc-400">
              (추이에는 회차별 최신 것만 들어간다)
            </span>
          </button>
          {attemptsOpen && (
            <div className="mt-3 space-y-1.5">
              {attemptRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-700"
                >
                  <span className="min-w-0 truncate">
                    <span className="text-zinc-400">{row.date}</span>
                    <span className="mx-1.5 text-zinc-300">·</span>
                    {row.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-500">
                    {row.correct}/{row.total}
                    {row.est && (
                      <span className="ml-2 text-violet-600 dark:text-violet-400">
                        환산 약 {row.est.score}/{row.est.max}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-zinc-400">
        시험 프로필의 선택 과목: {activeCodes.map(getSubjectLabel).join(", ")} ·{" "}
        {Object.keys(EJU_SUBJECTS).length}개 과목 정의됨
      </p>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useStorage } from "@/context/StorageContext";

export function StudyHeatmap() {
  const { data } = useStorage();

  const { cells, max } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 83); // ~12 weeks

    // align to Sunday
    start.setDate(start.getDate() - start.getDay());

    const countByDate = new Map<string, number>();
    for (const log of data.studyLogs) {
      countByDate.set(log.date, (countByDate.get(log.date) ?? 0) + log.count);
    }

    const result: { date: string; count: number }[] = [];
    const cur = new Date(start);
    let maxCount = 0;
    while (cur <= today) {
      const key = cur.toISOString().split("T")[0];
      const count = countByDate.get(key) ?? 0;
      maxCount = Math.max(maxCount, count);
      result.push({ date: key, count });
      cur.setDate(cur.getDate() + 1);
    }
    return { cells: result, max: maxCount };
  }, [data.studyLogs]);

  const level = (count: number) => {
    if (count === 0) return 0;
    if (max === 0) return 1;
    const ratio = count / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  const colors = [
    "bg-zinc-100 dark:bg-zinc-800",
    "bg-green-200 dark:bg-green-900",
    "bg-green-300 dark:bg-green-700",
    "bg-green-500 dark:bg-green-600",
    "bg-green-700 dark:bg-green-400",
  ];

  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">학습 히트맵 (12주)</h3>
      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.count}회`}
                className={`h-3 w-3 rounded-sm ${colors[level(cell.count)]}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

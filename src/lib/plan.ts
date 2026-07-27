import type { AppData, PlanTarget } from "./types";
import { todayString } from "./utils";

export type PlanOptions = {
  excludeWeekends?: boolean;
  bufferDays?: number;
};

function countWeekdays(from: string, to: string, excludeWeekends: boolean): number {
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  if (end < start) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (!excludeWeekends || (day !== 0 && day !== 6)) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

export function computeDeckProgress(data: AppData, deckId: string) {
  const cards = data.cards.filter((c) => c.deckId === deckId);
  const completed = cards.filter((c) => c.srs.repetitions > 0).length;
  return { total: cards.length, completed };
}

export function computeSubjectProgress(data: AppData, subjectId: string) {
  const unitIds = new Set(data.units.filter((u) => u.subjectId === subjectId).map((u) => u.id));
  const items = data.items.filter((i) => unitIds.has(i.unitId));
  const completed = items.filter((i) => {
    if (i.type === "problem") return i.solved;
    return true; // concept는 조회만 해도 완료로 치지 않음 — 개념은 0으로
  }).filter((i) => i.type === "problem" && i.solved).length;
  const total = items.filter((i) => i.type === "problem").length || items.length;
  return { total, completed };
}

export function computeDailyQuota(
  remaining: number,
  dueDate: string,
  options: PlanOptions = {}
): number {
  const excludeWeekends = options.excludeWeekends ?? true;
  const bufferDays = options.bufferDays ?? 0;
  const today = todayString();

  const due = new Date(dueDate + "T00:00:00");
  due.setDate(due.getDate() - bufferDays);
  const effectiveDue = due.toISOString().split("T")[0];

  const days = countWeekdays(today, effectiveDue, excludeWeekends);
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / days);
}

export function refreshPlanTarget(
  target: PlanTarget,
  data: AppData,
  options: PlanOptions = {}
): PlanTarget {
  const progress =
    target.kind === "deck"
      ? computeDeckProgress(data, target.refId)
      : computeSubjectProgress(data, target.refId);

  const remaining = Math.max(0, progress.total - progress.completed);
  return {
    ...target,
    totalUnits: progress.total,
    completedUnits: progress.completed,
    dailyQuota: computeDailyQuota(remaining, target.dueDate, options),
  };
}

export function computePlan(
  data: AppData,
  examDate?: string,
  options: PlanOptions = {}
): PlanTarget[] {
  const dueFallback = examDate ?? data.examProfile?.examDate ?? todayString();
  return data.planTargets.map((t) =>
    refreshPlanTarget(
      { ...t, dueDate: t.dueDate || dueFallback },
      data,
      {
        excludeWeekends: options.excludeWeekends ?? data.settings?.excludeWeekends ?? true,
        bufferDays: options.bufferDays ?? data.settings?.planBufferDays ?? 7,
      }
    )
  );
}

export function estimateCompletionDate(
  remaining: number,
  dailyQuota: number,
  excludeWeekends = true
): string {
  if (remaining <= 0) return todayString();
  const pace = Math.max(1, dailyQuota);
  let left = remaining;
  const cur = new Date();
  while (left > 0) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (!excludeWeekends || (day !== 0 && day !== 6)) {
      left -= pace;
    }
  }
  return cur.toISOString().split("T")[0];
}

export function daysDiff(from: string, to: string): number {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T00:00:00").getTime();
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

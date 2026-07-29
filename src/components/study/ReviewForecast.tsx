"use client";

import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { getReviewForecast } from "@/lib/srs";
import { cn } from "@/lib/utils";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 앞으로 며칠 동안 복습 카드가 몇 장씩 올라오는지.
 *
 * 히트맵은 지나간 기록만 보여준다. 정작 판단이 필요한 건 앞쪽이다 —
 * 새 단어장을 한 권 더 담아도 되는지, 이번 주에 몰린 날이 있는지.
 */
export function ReviewForecast({ days = 14 }: { days?: number }) {
  const { data } = useStorage();
  const forecast = useMemo(() => getReviewForecast(data.cards, days), [data.cards, days]);

  const max = Math.max(1, ...forecast.map((f) => f.count));
  const weekTotal = forecast.slice(0, 7).reduce((n, f) => n + f.count, 0);
  const hasAny = forecast.some((f) => f.count > 0);

  if (data.cards.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="h-5 w-5 text-blue-500" />
          복습 예보
        </h2>
        <span className="text-xs text-zinc-500">앞으로 7일 {weekTotal}장</span>
      </div>

      {!hasAny ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          앞으로 {days}일 안에 올라올 복습이 없다. 새 단어장을 한 권 담기 좋은 때다.
        </p>
      ) : (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <div className="flex items-end gap-1.5">
            {forecast.map((slot, i) => {
              const date = new Date(`${slot.date}T00:00:00`);
              const isToday = i === 0;
              const heavy = slot.count >= 100;
              return (
                <div key={slot.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      slot.count === 0 ? "text-transparent" : "text-zinc-400"
                    )}
                  >
                    {slot.count}
                  </span>
                  <div
                    title={`${slot.date} · ${slot.count}장`}
                    className={cn(
                      "w-full rounded-t",
                      isToday
                        ? "bg-red-500"
                        : heavy
                          ? "bg-amber-500"
                          : "bg-blue-400 dark:bg-blue-500"
                    )}
                    style={{
                      // 0장인 날도 바닥선이 보이도록 최소 높이를 준다
                      height: `${slot.count === 0 ? 2 : Math.max(6, (slot.count / max) * 72)}px`,
                    }}
                  />
                  <span
                    className={cn(
                      "text-[10px]",
                      isToday ? "font-semibold text-red-500" : "text-zinc-400"
                    )}
                  >
                    {isToday ? "오늘" : WEEKDAY[date.getDay()]}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
            밀린 카드는 오늘 칸에 합산했다. 하루 100장이 넘는 날(주황)이 이어지면 새 단어장을
            담기 전에 지금 것부터 끝내는 게 낫다.
          </p>
        </div>
      )}
    </section>
  );
}

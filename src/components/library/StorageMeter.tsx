"use client";

import { HardDrive, TriangleAlert } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { cn } from "@/lib/utils";

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

export function StorageMeter() {
  const { storageUsage, storageError, syncInfo } = useStorage();
  const pct = Math.min(100, Math.round(storageUsage.ratio * 100));
  const tight = storageUsage.ratio > 0.8;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <HardDrive className="h-4 w-4 text-zinc-400" />
          브라우저 저장 공간
        </span>
        <span className={cn("tabular-nums", tight ? "text-red-500" : "text-zinc-500")}>
          {mb(storageUsage.bytes)} / {mb(storageUsage.limitBytes)} ({pct}%)
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-blue-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        학습 기록은 이 브라우저 안에만 저장된다. 기준은 가장 빡빡한 Safari(5MB)로 잡았다.
        Chrome·Firefox는 10MB 정도라 더 여유가 있다.
      </p>
      {syncInfo.loggedIn && (
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
          이 기기 저장이 한도를 넘어도 서버 사본은 남지만, 이 기기에서 새 기록 저장은 실패할 수 있다.
        </p>
      )}
      {storageError && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {storageError}
        </p>
      )}
    </section>
  );
}

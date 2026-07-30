"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { reportError } from "@/lib/errorLog";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError({
      message: error.message,
      stack: error.stack,
      context: "react-error-boundary",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-6 text-center dark:bg-zinc-950">
      <AlertTriangle className="h-10 w-10 text-red-500" />
      <div>
        <h1 className="text-lg font-bold">문제가 발생했습니다</h1>
        <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
          예상치 못한 오류입니다. 자동으로 기록됐습니다. 다시 시도해도 안 되면 홈으로
          돌아가 보세요.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          <RotateCcw className="h-4 w-4" />
          다시 시도
        </button>
        <Link
          href="/"
          className="flex items-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errorLog";

/**
 * React 렌더링 중 에러는 error.tsx가 잡지만, 이벤트 핸들러·비동기 코드에서 터지는
 * 에러(예: 버튼 onClick 안의 실수, await 없는 프라미스 거절)는 그걸로 안 잡힌다.
 * window 레벨에서 마지막으로 붙잡아 기록만 한다 — 화면은 건드리지 않는다.
 * 이미 뭔가 깨진 상태에서 UI까지 바꾸면 사용자가 더 헷갈린다.
 */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      reportError({
        message: e.message || "Unknown window error",
        stack: e.error instanceof Error ? e.error.stack : undefined,
        context: "window-error",
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      reportError({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        context: "unhandled-rejection",
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

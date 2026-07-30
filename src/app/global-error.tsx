"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errorLog";

/**
 * global-error는 루트 레이아웃(app/layout.tsx) 자체가 죽었을 때만 뜬다.
 * 이 경우 layout.tsx가 실행되지 않으므로 globals.css(Tailwind)도 못 믿는다 —
 * 그래서 클래스 대신 인라인 스타일만 쓴다.
 */
export default function GlobalError({
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
    <html lang="ko">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1.5rem",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
          background: "#fafafa",
          color: "#18181b",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
            앱을 불러오지 못했습니다
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#71717a" }}>
            문제가 자동으로 기록됐습니다. 새로고침해 주세요.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              borderRadius: "0.75rem",
              background: "#ef4444",
              color: "white",
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}

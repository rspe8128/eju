import { getSupabaseBrowserClient } from "./supabase/client";

export type ErrorContext = "react-error-boundary" | "window-error" | "unhandled-rejection";

/** 무한 루프성 에러가 테이블을 순식간에 채우지 않도록 세션당 상한을 둔다. */
const MAX_REPORTS_PER_SESSION = 20;
let reportCount = 0;
/** 같은 에러를 반복해서 기록하지 않는다 — 한 세션에서 같은 원인은 한 번이면 충분하다. */
const seen = new Set<string>();

/**
 * 에러를 error_logs 테이블에 최선의 노력으로 남긴다.
 * 실패해도 절대 화면에 영향을 주지 않는다 — 에러를 기록하려다 또 에러를 내면 안 된다.
 */
export function reportError(input: { message: string; stack?: string; context: ErrorContext }) {
  try {
    if (reportCount >= MAX_REPORTS_PER_SESSION) return;
    const key = `${input.context}:${input.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    reportCount += 1;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await supabase.from("error_logs").insert({
          user_id: session?.user?.id,
          message: input.message.slice(0, 2000),
          stack: input.stack?.slice(0, 4000),
          path: typeof window !== "undefined" ? window.location.pathname : null,
          context: input.context,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        });
      } catch {
        // 마이그레이션 전이거나 네트워크 문제 등 — 조용히 무시
      }
    })();
  } catch {
    // 기록 자체가 실패해도 무시
  }
}

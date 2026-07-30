"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Trash2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminErrorRow } from "@/lib/supabase/types";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ko-KR");
  } catch {
    return value;
  }
}

const CONTEXT_LABEL: Record<string, string> = {
  "react-error-boundary": "화면 렌더링",
  "window-error": "스크립트",
  "unhandled-rejection": "비동기(Promise)",
};

/**
 * 자동으로 쌓인 에러 로그를 본다. AdminUsersView와 같은 권한 체크(is_admin RPC)를
 * 각자 독립적으로 한다 — 관리자 페이지는 트래픽이 적어 중복 호출 비용이 무시할
 * 만하고, 두 섹션을 하나로 합치면 오히려 상태가 얽힌다.
 */
export function AdminErrorLogView() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<AdminErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const load = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    setUser(authData.user ?? null);
    if (!authData.user) {
      setLoading(false);
      return;
    }
    const { data: adminFlag } = await supabase.rpc("is_admin");
    setIsAdmin(Boolean(adminFlag));
    if (!adminFlag) {
      setLoading(false);
      return;
    }
    const { data, error: listError } = await supabase.rpc("admin_list_errors", {
      limit_count: 200,
    });
    if (listError) {
      setError(listError.message);
    } else {
      setRows((data ?? []) as AdminErrorRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [supabase]);

  const clearAll = async () => {
    if (!supabase) return;
    if (!window.confirm("에러 로그를 전부 지울까요?")) return;
    setClearing(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("admin_clear_errors");
      if (rpcError) throw rpcError;
      setRows([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setClearing(false);
    }
  };

  // 계정 관리 섹션에서 이미 로그인·권한 안내를 하므로, 여기서는 조용히 숨긴다.
  if (loading || !user || !isAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">에러 로그</h2>
          <p className="mt-1 text-sm text-zinc-500">
            화면에서 잡히지 않은 에러가 자동으로 여기 쌓인다. 최근 200개만 본다.
          </p>
        </div>
        {rows.length > 0 && (
          <button
            disabled={clearing}
            onClick={() => void clearAll()}
            className="flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            전체 삭제
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          기록된 에러가 없다.
        </p>
      ) : (
        <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-700/60 dark:border-zinc-700 dark:bg-zinc-800">
          {rows.map((row) => {
            const isOpen = expandedId === row.id;
            return (
              <div key={row.id} className="px-4 py-3">
                <button
                  onClick={() => setExpandedId(isOpen ? null : row.id)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.message}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {CONTEXT_LABEL[row.context] ?? row.context}
                      {row.path ? ` · ${row.path}` : ""}
                      {row.user_email ? ` · ${row.user_email}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs text-zinc-400">
                    {formatDate(row.created_at)}
                  </span>
                </button>
                {isOpen && row.stack && (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-50 p-3 text-[11px] leading-relaxed text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    {row.stack}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

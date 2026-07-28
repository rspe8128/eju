"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminUserRow } from "@/lib/supabase/types";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ko-KR");
  } catch {
    return value;
  }
}

export function AdminUsersView() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setError("");
    const { data: authData } = await supabase.auth.getUser();
    const current = authData.user ?? null;
    setUser(current);
    if (!current) {
      setIsAdmin(false);
      setUsers([]);
      setLoading(false);
      return;
    }

    const { data: adminFlag, error: adminError } = await supabase.rpc("is_admin");
    if (adminError) {
      setError(adminError.message);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    if (!adminFlag) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);

    const { data, error: listError } = await supabase.rpc("admin_list_users");
    if (listError) {
      setError(listError.message);
      setUsers([]);
    } else {
      setUsers((data ?? []) as AdminUserRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [supabase]);

  const setRole = async (targetId: string, newRole: "user" | "admin") => {
    if (!supabase) return;
    setBusyId(targetId);
    setError("");
    setMessage("");
    try {
      const { error: rpcError } = await supabase.rpc("admin_set_role", {
        target_id: targetId,
        new_role: newRole,
      });
      if (rpcError) throw rpcError;
      setMessage(newRole === "admin" ? "관리자로 지정했습니다." : "일반 사용자로 변경했습니다.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "역할 변경에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (targetId: string, email: string | null) => {
    if (!supabase) return;
    const ok = window.confirm(
      `${email ?? targetId} 계정을 삭제할까요?\n학습 동기화 데이터도 함께 삭제됩니다.`
    );
    if (!ok) return;
    setBusyId(targetId);
    setError("");
    setMessage("");
    try {
      const { error: rpcError } = await supabase.rpc("admin_delete_user", {
        target_id: targetId,
      });
      if (rpcError) throw rpcError;
      setMessage("계정을 삭제했습니다.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "계정 삭제에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-sm text-zinc-500">불러오는 중...</p>;

  if (!supabase) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-amber-300 p-6 text-sm">
        Supabase 환경변수가 없어 관리자 기능을 사용할 수 없습니다.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 p-8 text-center dark:border-zinc-700">
        <p className="font-medium">관리자 페이지는 로그인 후 이용할 수 있습니다.</p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 p-8 text-center dark:border-zinc-700">
        <p className="font-medium">관리자 권한이 없습니다.</p>
        <p className="mt-1.5 text-sm text-zinc-500">
          `marinekorea999@gmail.com` 계정으로 로그인한 뒤, SQL Phase 3를 실행했는지 확인하세요.
        </p>
        <Link href="/profile" className="mt-4 inline-flex text-sm text-blue-600 hover:underline">
          프로필로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">계정 관리</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          가입·로그인한 모든 계정을 확인하고, 관리자 지정 또는 삭제할 수 있습니다.
        </p>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
            <tr>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">역할</th>
              <th className="px-4 py-3 font-medium">가입</th>
              <th className="px-4 py-3 font-medium">최근 로그인</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  등록된 계정이 없습니다.
                </td>
              </tr>
            ) : (
              users.map((row) => {
                const isSelf = row.id === user.id;
                const busy = busyId === row.id;
                return (
                  <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-700/60">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.email ?? "(이메일 없음)"}</div>
                      {(row.target_university || row.target_major) && (
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {[row.target_university, row.target_major].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{row.display_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.role === "admin"
                            ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                            : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                        }
                      >
                        {row.role === "admin" ? "관리자" : "사용자"}
                      </span>
                      {isSelf && <span className="ml-2 text-xs text-zinc-400">나</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                      {formatDate(row.last_sign_in_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.role === "admin" ? (
                          <button
                            disabled={busy}
                            onClick={() => void setRole(row.id, "user")}
                            className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-700"
                          >
                            관리자 해제
                          </button>
                        ) : (
                          <button
                            disabled={busy}
                            onClick={() => void setRole(row.id, "admin")}
                            className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-700"
                          >
                            관리자 지정
                          </button>
                        )}
                        {!isSelf && (
                          <button
                            disabled={busy}
                            onClick={() => void deleteUser(row.id, row.email)}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/40"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

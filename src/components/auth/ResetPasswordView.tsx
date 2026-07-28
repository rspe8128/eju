"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordView() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onReset = async () => {
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("비밀번호를 변경했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (!supabase) {
    return <p className="text-sm text-zinc-500">환경변수 설정 후 비밀번호 재설정을 사용할 수 있습니다.</p>;
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">비밀번호 재설정</h1>
      <p className="text-sm text-zinc-500">메일 링크로 돌아온 뒤 새 비밀번호를 입력하세요.</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="새 비밀번호"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        onClick={onReset}
        disabled={busy || password.length < 8}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "변경 중..." : "비밀번호 변경"}
      </button>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Link href="/login" className="text-xs underline text-zinc-500">
        로그인으로 돌아가기
      </Link>
    </div>
  );
}

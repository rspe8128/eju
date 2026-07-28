"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginView() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const unavailable = !supabase;

  const onGoogleLogin = async () => {
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      // Supabase Redirect URL에 등록된 경로로만 보낸다 (/profile)
      const redirectTo = `${window.location.origin}/profile`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { access_type: "online", prompt: "select_account" },
        },
      });
      if (oauthError) throw oauthError;
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Google 로그인에 실패했습니다.";
      if (/provider is not enabled|Unsupported provider/i.test(raw)) {
        setError(
          "Google 로그인이 아직 꺼져 있습니다. Supabase → Authentication → Providers → Google을 확인하세요."
        );
      } else {
        setError(raw);
      }
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold">EJU Study</h1>
        <p className="mt-2 text-sm text-zinc-500">Google 계정으로 로그인해 주세요.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <button
          onClick={() => void onGoogleLogin()}
          disabled={busy || unavailable}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <GoogleIcon />
          {busy ? "이동 중..." : "Google로 계속하기"}
        </button>

        {unavailable && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            Supabase 환경변수가 없어 로그인할 수 없습니다.
          </div>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <p className="text-center text-xs text-zinc-500">
        로그인 후에만 학습·성적·관리 기능을 사용할 수 있습니다.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13.2 24 13.2c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.1 4 9.2 8.5 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.1 39.4 15.9 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 36.9 44 31.8 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

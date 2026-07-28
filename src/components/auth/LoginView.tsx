"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginView() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const unavailable = !supabase;

  const onSubmit = async () => {
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        setMessage("로그인되었습니다.");
        router.replace("/profile");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      if (data.session) {
        setMessage("회원가입이 완료되었습니다.");
        router.replace("/profile");
        return;
      }
      setMessage("가입 확인 메일을 보냈습니다. 메일 확인 후 로그인해 주세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증 요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const onGoogleLogin = async () => {
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
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
          "Google 로그인이 아직 꺼져 있습니다. Supabase → Authentication → Sign In / Providers → Google을 켠 뒤, Google Cloud Client ID/Secret을 넣으세요."
        );
      } else {
        setError(raw);
      }
      setBusy(false);
    }
  };

  const onResetPassword = async () => {
    if (!supabase) return;
    if (!email.trim()) {
      setError("비밀번호 재설정 메일을 받으려면 이메일을 먼저 입력하세요.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setMessage("비밀번호 재설정 메일을 보냈습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "재설정 메일 전송에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          로그인은 선택사항이다. 로그인하지 않아도 학습은 그대로 가능하다.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-4 flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-700">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm ${mode === "signin" ? "bg-white shadow dark:bg-zinc-900" : ""}`}
          >
            로그인
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm ${mode === "signup" ? "bg-white shadow dark:bg-zinc-900" : ""}`}
          >
            회원가입
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="8자 이상"
            />
          </label>

          <button
            onClick={onSubmit}
            disabled={busy || unavailable}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "처리 중..." : mode === "signin" ? "로그인" : "회원가입"}
          </button>
          <button
            onClick={onGoogleLogin}
            disabled={busy || unavailable}
            className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-700/40"
          >
            Google로 계속하기
          </button>

          <button
            onClick={onResetPassword}
            disabled={busy || unavailable}
            className="text-xs text-zinc-500 underline underline-offset-2"
          >
            비밀번호 재설정 메일 보내기
          </button>
        </div>

        {unavailable && (
          <div className="mt-4 space-y-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <p className="font-medium">Supabase가 아직 연결되지 않았습니다.</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Supabase 프로젝트 Settings → API에서 URL / anon key 복사</li>
              <li>
                `.env.local`과 Vercel Environment Variables에
                `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등록
              </li>
              <li>
                SQL Editor에서 `supabase/setup_all.sql` 실행
              </li>
              <li>Auth → URL Configuration에 redirect URL 등록 후 재배포</li>
            </ol>
          </div>
        )}
        {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <p className="text-xs text-zinc-500">
        로그인하면 이 기기 학습 기록이 계정에 동기화된다.{" "}
        <Link href="/" className="underline">
          대시보드로 돌아가기
        </Link>
      </p>
    </div>
  );
}

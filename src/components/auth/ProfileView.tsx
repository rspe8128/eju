"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";

type ProfileForm = {
  display_name: string;
  avatar_url: string;
  target_university: string;
  target_major: string;
  exam_target_date: string;
};

function emptyForm(): ProfileForm {
  return {
    display_name: "",
    avatar_url: "",
    target_university: "",
    target_major: "",
    exam_target_date: "",
  };
}

export function ProfileView() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const boot = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile) {
          const p = profile as ProfileRow;
          setIsAdmin(p.role === "admin");
          setForm({
            display_name: p.display_name ?? "",
            avatar_url: p.avatar_url ?? "",
            target_university: p.target_university ?? "",
            target_major: p.target_major ?? "",
            exam_target_date: p.exam_target_date ?? "",
          });
        }
      }
      setLoading(false);
    };
    void boot();
  }, [supabase]);

  const saveProfile = async () => {
    if (!supabase || !user) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          display_name: form.display_name || null,
          avatar_url: form.avatar_url || null,
          target_university: form.target_university || null,
          target_major: form.target_major || null,
          exam_target_date: form.exam_target_date || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (upsertError) throw upsertError;
      setMessage("프로필을 저장했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "프로필 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!supabase || !user) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm((prev) => ({ ...prev, avatar_url: data.publicUrl }));
      setMessage("아바타를 업로드했습니다. 저장 버튼을 눌러 반영하세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "아바타 업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-zinc-500">불러오는 중...</p>;

  if (!supabase) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-300 p-6 text-sm">
        Supabase 환경변수가 없어 프로필 기능을 사용할 수 없습니다.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 p-8 text-center dark:border-zinc-700">
        <p className="font-medium">로그인 후 프로필을 편집할 수 있습니다.</p>
        <p className="mt-1.5 text-sm text-zinc-500">
          로그인하지 않아도 학습 기능은 그대로 사용할 수 있습니다.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">프로필</h1>
          <p className="mt-1.5 text-sm text-zinc-500">학습 데이터와 별개로 계정 정보를 관리합니다.</p>
          {user.email && <p className="mt-1 text-xs text-zinc-400">{user.email}</p>}
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            계정 관리
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-4 flex items-center gap-3">
          {form.avatar_url ? (
            <img src={form.avatar_url} alt="avatar" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-xs text-zinc-500 dark:bg-zinc-700">
              없음
            </div>
          )}
          <label className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-700">
            아바타 업로드
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            이름
            <input
              value={form.display_name}
              onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm">
            목표 대학
            <input
              value={form.target_university}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, target_university: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm">
            목표 학과
            <input
              value={form.target_major}
              onChange={(e) => setForm((prev) => ({ ...prev, target_major: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-sm">
            목표 EJU 회차
            <input
              type="date"
              value={form.exam_target_date}
              onChange={(e) => setForm((prev) => ({ ...prev, exam_target_date: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>

        <button
          onClick={() => void saveProfile()}
          disabled={busy}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "저장 중..." : "저장"}
        </button>

        {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

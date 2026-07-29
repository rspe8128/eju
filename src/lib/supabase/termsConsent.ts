import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const TERMS_PENDING_KEY = "eju_terms_pending";

/** 로그인 버튼 직전에 켜 둔다. OAuth 리다이렉트 후 소비한다. */
export function markTermsPending() {
  try {
    sessionStorage.setItem(TERMS_PENDING_KEY, "1");
  } catch {
    // private mode 등 — 배너로 보완
  }
}

function consumeTermsPending(): boolean {
  try {
    const value = sessionStorage.getItem(TERMS_PENDING_KEY);
    if (value) sessionStorage.removeItem(TERMS_PENDING_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

/**
 * 최초 동의만 기록한다. 이미 terms_agreed_at이 있으면 덮어쓰지 않는다.
 * @returns 저장에 성공했거나 이미 값이 있으면 true
 */
export async function setTermsAgreedAtIfEmpty(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_agreed_at")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.terms_agreed_at) return true;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ terms_agreed_at: now, updated_at: now })
    .eq("id", userId)
    .is("terms_agreed_at", null);

  if (error) throw error;
  return true;
}

/** OAuth 복귀 직후: 로그인 전 체크 플래그가 있으면 DB에 동의 시각을 남긴다. */
export async function recordTermsIfPending(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  if (!consumeTermsPending()) return;
  await setTermsAgreedAtIfEmpty(supabase, userId);
}

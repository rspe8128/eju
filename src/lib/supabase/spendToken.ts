import { createSupabaseServerClient } from "./server";

export type SpendResult = { ok: true } | { ok: false; status: 401 | 402 | 500; error: string };

/**
 * API 라우트에서 실제 외부 호출(OpenRouter/DeepL) 직전에 부른다.
 *
 * 비용은 DB 함수(spend_tokens)가 액션 이름만 보고 정한다 — 여기서 액수를 넘기지
 * 않는다. 클라이언트가 액수를 불러주는 구조였다면 요청을 조작해서 원하는 만큼만
 * 깎게 만들 수 있었을 것이다.
 */
export async function spendToken(action: "grade_writing" | "translate"): Promise<SpendResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, status: 500, error: "서버 설정 오류입니다. 관리자에게 문의하세요." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  const { error } = await supabase.rpc("spend_tokens", { p_action: action });
  if (error) {
    if (error.message.includes("insufficient_tokens")) {
      return {
        ok: false,
        status: 402,
        error: "보유한 토큰을 다 썼습니다. 관리자에게 충전을 요청하세요.",
      };
    }
    return { ok: false, status: 500, error: "사용량 확인 중 오류가 발생했습니다." };
  }

  return { ok: true };
}

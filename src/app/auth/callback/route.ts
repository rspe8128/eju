import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/profile";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const fail = NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));

  if (!code) return fail;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  if (!isLocal && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}

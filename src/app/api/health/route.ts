import { NextResponse } from "next/server";
import { getDbBackend } from "@/lib/db";

export const runtime = "nodejs";

/** GET /api/health — DB 백엔드 상태 */
export async function GET() {
  const backend = getDbBackend();
  return NextResponse.json({
    ok: true,
    backend,
    tursoConfigured: Boolean(
      process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
    ),
    gistConfigured: Boolean(
      process.env.EJU_PROGRESS_GIST_ID && process.env.EJU_GITHUB_TOKEN
    ),
  });
}

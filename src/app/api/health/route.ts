import { NextResponse } from "next/server";
import { getDbBackend } from "@/lib/db";

export const runtime = "nodejs";

/** GET /api/health — DB 백엔드 상태 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    backend: getDbBackend(),
    tursoConfigured: Boolean(
      process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
    ),
  });
}

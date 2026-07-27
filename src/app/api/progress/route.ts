import { NextResponse } from "next/server";
import { createProgress, getDbBackend, getProgress, saveProgress } from "@/lib/db";

export const runtime = "nodejs";

/** GET /api/progress?key=eju-xxxx — 진행도 불러오기 */
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key")?.trim();
  if (!key) {
    return NextResponse.json({ error: "sync key가 필요합니다." }, { status: 400 });
  }

  try {
    const row = await getProgress(key);
    if (!row) {
      return NextResponse.json({ error: "해당 키의 진행도가 없습니다." }, { status: 404 });
    }

    const data = JSON.parse(row.data);
    return NextResponse.json({
      syncKey: row.sync_key,
      updatedAt: row.updated_at,
      backend: getDbBackend(),
      data,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/progress
 * - body: { data } → 새 sync key 발급 + 저장
 * - body: { key, data } → 기존 키에 덮어쓰기
 */
export async function POST(request: Request) {
  let body: { key?: string; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  if (body.data == null || typeof body.data !== "object") {
    return NextResponse.json({ error: "data 객체가 필요합니다." }, { status: 400 });
  }

  const payload = JSON.stringify(body.data);
  if (payload.length > 25_000_000) {
    return NextResponse.json({ error: "데이터가 너무 큽니다." }, { status: 413 });
  }

  try {
    const key = body.key?.trim();
    const result = key
      ? await saveProgress(key, payload)
      : await createProgress(payload);

    return NextResponse.json({
      syncKey: result.syncKey,
      updatedAt: result.updatedAt,
      backend: getDbBackend(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "저장 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

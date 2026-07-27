import { NextResponse } from "next/server";

/**
 * DeepL 번역 프록시.
 *
 * 브라우저에서 DeepL을 직접 부르면 (1) CORS에 막히고 (2) API 키가 클라이언트 번들에
 * 노출된다. 그래서 서버 라우트를 거친다.
 *
 * 키는 .env.local의 DEEPL_API_KEY 로만 읽는다. 소스에 하드코딩하지 말 것.
 * Vercel에 올릴 때는 Project → Settings → Environment Variables 에 같은 이름으로 등록.
 *
 * ── 두 가지 요청 형태 ────────────────────────────────────────────────
 *  A) { text: "..." }            → { text: "..." }
 *     붙여넣기 번역 패널이 쓴다. 긴 글이면 문단 단위로 잘라서 여러 번 부른다.
 *
 *  B) { texts: ["...", ...] }    → { texts: ["...", ...] }
 *     모의고사가 쓴다. 지문 문단 + 발문 + 선택지를 한 번에 보내고
 *     **입력과 같은 길이·같은 순서**의 배열을 돌려받는다.
 *     DeepL은 요청당 text 50개까지 받으므로 50개씩 끊어 보낸다.
 *     배열 형태로 보내야 문단 경계가 뭉개지지 않고, 호출 수도 줄어 무료 한도를 아낀다.
 */

export const runtime = "nodejs";

/** 키가 ":fx"로 끝나면 무료 플랜 → api-free 엔드포인트를 써야 한다. */
function endpointFor(key: string): string {
  return key.trim().endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

/** DeepL 요청당 텍스트 길이 제한을 피하려고 문단 단위로 자른다. */
function chunk(text: string, max = 4000): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let buf = "";
  for (const para of text.split(/\n\s*\n/)) {
    if ((buf + para).length > max && buf) {
      parts.push(buf);
      buf = "";
    }
    buf += (buf ? "\n\n" : "") + para;
  }
  if (buf) parts.push(buf);
  return parts;
}

/** DeepL 요청당 text 배열 상한 */
const MAX_TEXTS_PER_CALL = 50;

function batches<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function errorMessage(status: number): string {
  if (status === 403) return "DeepL 인증에 실패했습니다. API 키를 확인하세요.";
  if (status === 456) return "이번 달 DeepL 무료 번역 한도(50만 자)를 모두 썼습니다.";
  if (status === 429) return "요청이 너무 잦습니다. 잠시 후 다시 시도하세요.";
  if (status === 413) return "한 번에 보낸 텍스트가 너무 깁니다.";
  return `DeepL 오류 (${status})`;
}

type DeepLResponse = { translations?: { text: string }[] };

async function callDeepL(
  key: string,
  texts: string[],
  sourceLang: string,
  targetLang: string
): Promise<{ ok: true; texts: string[] } | { ok: false; status: number; detail: string }> {
  const res = await fetch(endpointFor(key), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      source_lang: sourceLang,
      target_lang: targetLang,
      // 시험 지문은 문어체이므로 문장 분리를 DeepL에 맡긴다
      split_sentences: "1",
      preserve_formatting: true,
    }),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, detail: await res.text() };
  }

  const json = (await res.json()) as DeepLResponse;
  const out = (json.translations ?? []).map((t) => t.text);
  // DeepL은 입력 순서를 보존한다. 그래도 개수가 어긋나면 빈 문자열로 채워
  // 클라이언트에서 인덱스가 밀리지 않게 한다.
  while (out.length < texts.length) out.push("");
  return { ok: true, texts: out.slice(0, texts.length) };
}

export async function POST(req: Request) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "DEEPL_API_KEY가 설정되지 않았습니다. 프로젝트 루트에 .env.local 파일을 만들고 DEEPL_API_KEY=... 를 넣은 뒤 개발 서버를 재시작하세요.",
      },
      { status: 500 }
    );
  }

  let body: {
    text?: string;
    texts?: string[];
    sourceLang?: string;
    targetLang?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const sourceLang = body.sourceLang ?? "JA";
  const targetLang = body.targetLang ?? "KO";

  // ── B) 배열 모드 ──────────────────────────────────────────────────
  if (Array.isArray(body.texts)) {
    const inputs = body.texts.map((t) => (typeof t === "string" ? t : ""));
    if (inputs.length === 0) {
      return NextResponse.json({ texts: [] });
    }
    if (inputs.length > 400) {
      return NextResponse.json(
        { error: "한 번에 번역할 수 있는 항목 수(400개)를 넘었습니다." },
        { status: 400 }
      );
    }
    const totalChars = inputs.reduce((n, t) => n + t.length, 0);
    if (totalChars > 40_000) {
      return NextResponse.json(
        { error: "한 번에 번역할 수 있는 길이를 넘었습니다. 나눠서 요청하세요." },
        { status: 400 }
      );
    }

    // 빈 문자열은 DeepL에 보내지 않고 그대로 돌려준다 (한도 절약).
    const indexed = inputs.map((t, i) => ({ t, i })).filter((x) => x.t.trim().length > 0);
    const result = new Array<string>(inputs.length).fill("");

    try {
      for (const group of batches(indexed, MAX_TEXTS_PER_CALL)) {
        const r = await callDeepL(
          key,
          group.map((g) => g.t),
          sourceLang,
          targetLang
        );
        if (!r.ok) {
          return NextResponse.json(
            { error: errorMessage(r.status), detail: r.detail },
            { status: r.status }
          );
        }
        group.forEach((g, k) => {
          result[g.i] = r.texts[k] ?? "";
        });
      }
    } catch (e) {
      return NextResponse.json(
        { error: "번역 요청 중 네트워크 오류가 발생했습니다.", detail: String(e) },
        { status: 502 }
      );
    }

    return NextResponse.json({ texts: result });
  }

  // ── A) 단일 문자열 모드 (기존 번역 패널) ──────────────────────────
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "번역할 텍스트가 비어 있습니다." }, { status: 400 });
  }
  if (text.length > 30_000) {
    return NextResponse.json(
      { error: "한 번에 번역할 수 있는 길이를 넘었습니다. 지문을 나눠서 넣어주세요." },
      { status: 400 }
    );
  }

  try {
    const results: string[] = [];
    for (const part of chunk(text)) {
      const r = await callDeepL(key, [part], sourceLang, targetLang);
      if (!r.ok) {
        return NextResponse.json(
          { error: errorMessage(r.status), detail: r.detail },
          { status: r.status }
        );
      }
      results.push(r.texts[0] ?? "");
    }
    return NextResponse.json({ text: results.join("\n\n") });
  } catch (e) {
    return NextResponse.json(
      { error: "번역 요청 중 네트워크 오류가 발생했습니다.", detail: String(e) },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";

/**
 * DeepL 번역 프록시.
 *
 * 브라우저에서 DeepL을 직접 부르면 (1) CORS에 막히고 (2) API 키가 클라이언트 번들에
 * 노출된다. 그래서 서버 라우트를 거친다.
 *
 * 키는 .env.local의 DEEPL_API_KEY 로만 읽는다. 소스에 하드코딩하지 말 것.
 * Vercel에 올릴 때는 Project → Settings → Environment Variables 에 같은 이름으로 등록.
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

  let body: { text?: string; sourceLang?: string; targetLang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

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

  const chunks = chunk(text);

  try {
    const results: string[] = [];
    for (const part of chunks) {
      const res = await fetch(endpointFor(key), {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${key.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: [part],
          source_lang: body.sourceLang ?? "JA",
          target_lang: body.targetLang ?? "KO",
          // 시험 지문은 문어체이므로 문장 분리를 DeepL에 맡긴다
          split_sentences: "1",
          preserve_formatting: true,
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        const message =
          res.status === 403
            ? "DeepL 인증에 실패했습니다. API 키를 확인하세요."
            : res.status === 456
              ? "이번 달 DeepL 무료 번역 한도(50만 자)를 모두 썼습니다."
              : res.status === 429
                ? "요청이 너무 잦습니다. 잠시 후 다시 시도하세요."
                : `DeepL 오류 (${res.status})`;
        return NextResponse.json({ error: message, detail }, { status: res.status });
      }

      const json = (await res.json()) as {
        translations?: { text: string; detected_source_language?: string }[];
      };
      results.push(json.translations?.[0]?.text ?? "");
    }

    return NextResponse.json({ text: results.join("\n\n") });
  } catch (e) {
    return NextResponse.json(
      { error: "번역 요청 중 네트워크 오류가 발생했습니다.", detail: String(e) },
      { status: 502 }
    );
  }
}

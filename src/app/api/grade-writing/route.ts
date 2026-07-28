import { NextResponse } from "next/server";
import { WRITING_RUBRIC, RUBRIC_MAX, MIN_CHARS, MAX_CHARS } from "@/lib/writing/rubric";

/**
 * 記述(작문) AI 채점 — OpenRouter 경유.
 *
 * 키는 서버에서만 읽는다. 브라우저로 나가면 누구나 내 크레딧을 쓸 수 있으므로,
 * 절대 NEXT_PUBLIC_ 접두사를 붙이지 말 것.
 *
 * 모델은 OPENROUTER_MODEL 로 바꿀 수 있다. 슬러그가 틀리면 OpenRouter가 그대로
 * 알려주므로, 그 메시지를 사용자에게 보여줘서 코드 수정 없이 고칠 수 있게 한다.
 */

export const runtime = "nodejs";
/** 채점은 20초쯤 걸릴 수 있다 */
export const maxDuration = 60;

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * 기본 채점 모델.
 *
 * 일본어 문법·표현을 고쳐 주는 일이라 싼 모델은 첨삭 품질이 눈에 띄게 떨어진다.
 * 500자 답안 하나에 입력 1.2K · 출력 0.8K 토큰쯤 드니, 이 모델로도 채점 1건에
 * 15원 남짓이다. 더 싸게 쓰고 싶으면 .env.local 의 OPENROUTER_MODEL 을 바꾸면 된다.
 *
 *   anthropic/claude-sonnet-5      $2 / $10  per M  — 기본값, 첨삭 품질이 가장 안정적
 *   google/gemini-3.5-flash        $1.5 / $9 per M  — 조금 저렴
 *   google/gemini-3.1-flash-lite   $0.25 / $1.5     — 가장 저렴, 첨삭은 거칠어진다
 *
 * ※ 모델 슬러그는 수시로 바뀌고 옛 모델은 내려간다(claude-3.5-haiku 도 그랬다).
 *    404가 나면 `npm run check:ai` 가 현재 쓸 수 있는 후보를 뽑아 준다.
 */
const DEFAULT_MODEL = "anthropic/claude-sonnet-5";

type GradeRequest = {
  promptJa?: string;
  body?: string;
};

export type AxisScore = {
  key: string;
  label: string;
  score: number;
  max: number;
  comment: string;
};

export type SentenceFix = {
  original: string;
  corrected: string;
  reason: string;
};

export type GradeResult = {
  total: number;
  max: number;
  axes: AxisScore[];
  strengths: string[];
  improvements: string[];
  fixes: SentenceFix[];
  /** 모범 답안 방향 (전문을 대신 써 주지는 않는다) */
  advice: string;
  model: string;
};

function buildPrompt(promptJa: string, body: string): string {
  const rubric = WRITING_RUBRIC.map(
    (a) => `- ${a.label} (${a.key}, ${a.max}점 만점)\n${a.criteria.map((c) => `    · ${c}`).join("\n")}`
  ).join("\n");

  return `당신은 일본유학시험(EJU) 記述 채점관입니다. 한국인 수험생의 답안을 채점합니다.

# 출제 문제
${promptJa}

# 수험생 답안
${body}

# 채점 기준 (총 ${RUBRIC_MAX}점)
${rubric}

# 분량 규정
${MIN_CHARS}자 이상 ${MAX_CHARS}자 이하(공백 제외). 미달·초과는 과제 대응 점수에서 감점합니다.

# 채점 지침
- 후하게 주지 마십시오. 실제 EJU 평균은 50점 만점에 30점 안팎입니다.
- 각 축의 점수에는 반드시 답안에서 근거가 되는 부분을 들어 설명하십시오.
- fixes에는 실제로 문법·표현이 틀렸거나 부자연스러운 문장만 넣습니다. 최대 6개.
  답안을 통째로 다시 써 주지 마십시오. 수험생이 스스로 고칠 수 있게 짚어만 줍니다.
- 답안이 비어 있거나 주제와 전혀 무관하면 낮은 점수를 주고 그 이유를 쓰십시오.
- 설명(comment, strengths, improvements, reason, advice)은 **한국어**로 씁니다.
- original·corrected는 **일본어 원문 그대로** 씁니다.

# 출력 형식
아래 JSON만 출력하십시오. 코드블록 표시나 다른 말을 덧붙이지 마십시오.
{
  "axes": [
    { "key": "task", "score": 0, "comment": "" },
    { "key": "structure", "score": 0, "comment": "" },
    { "key": "language", "score": 0, "comment": "" }
  ],
  "strengths": ["", ""],
  "improvements": ["", ""],
  "fixes": [{ "original": "", "corrected": "", "reason": "" }],
  "advice": ""
}`;
}

/** 모델이 ```json 블록으로 감싸 보내는 경우가 잦아서 벗겨낸다. */
function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // 앞뒤에 설명을 붙인 경우 — 가장 바깥 중괄호만 잘라 본다
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clamp(n: unknown, max: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(max, Math.round(v)));
}

function errorMessage(status: number, detail: string): string {
  if (status === 401) return "OpenRouter 인증에 실패했습니다. OPENROUTER_API_KEY를 확인하세요.";
  if (status === 402)
    return "OpenRouter 크레딧이 부족합니다. openrouter.ai에서 잔액을 확인하세요.";
  if (status === 429) return "요청이 너무 잦습니다. 잠시 후 다시 시도하세요.";
  if (status === 404)
    return `모델을 찾을 수 없습니다. .env.local의 OPENROUTER_MODEL을 확인하세요. (${detail.slice(0, 200)})`;
  return `채점 서버 오류 (${status}). ${detail.slice(0, 200)}`;
}

export async function POST(req: Request) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "OPENROUTER_API_KEY가 설정되지 않았습니다. .env.local에 키를 넣고 개발 서버를 다시 시작하세요.",
      },
      { status: 500 }
    );
  }

  let payload: GradeRequest;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const promptJa = (payload.promptJa ?? "").trim();
  const body = (payload.body ?? "").trim();
  if (!body) {
    return NextResponse.json({ error: "채점할 답안이 비어 있습니다." }, { status: 400 });
  }
  if (body.length > 4000) {
    return NextResponse.json(
      { error: "답안이 너무 깁니다. 記述는 500자 이내입니다." },
      { status: 400 }
    );
  }

  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key.trim()}`,
        "Content-Type": "application/json",
        // OpenRouter가 통계용으로 권장하는 헤더. 없어도 동작한다.
        "HTTP-Referer": "https://eju-nu.vercel.app",
        "X-Title": "EJU Study",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content:
              "당신은 일본유학시험(EJU) 記述 채점관입니다. 지정된 JSON 형식만 출력합니다.",
          },
          { role: "user", content: buildPrompt(promptJa || "(문제 없음)", body) },
        ],
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "채점 서버에 연결하지 못했습니다.", detail: String(e) },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: errorMessage(res.status, detail), detail },
      { status: res.status }
    );
  }

  const json = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
  } | null;
  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "채점 결과가 비어 있습니다." }, { status: 502 });
  }

  const parsed = extractJson(content) as {
    axes?: { key?: string; score?: number; comment?: string }[];
    strengths?: string[];
    improvements?: string[];
    fixes?: { original?: string; corrected?: string; reason?: string }[];
    advice?: string;
  } | null;

  if (!parsed) {
    return NextResponse.json(
      { error: "채점 결과를 읽지 못했습니다. 다시 시도해 주세요.", detail: content.slice(0, 500) },
      { status: 502 }
    );
  }

  // 모델이 축을 빠뜨리거나 점수를 넘겨 주는 일이 있어서, 기준표를 축으로 삼아 다시 맞춘다.
  const axes: AxisScore[] = WRITING_RUBRIC.map((a) => {
    const got = parsed.axes?.find((x) => x.key === a.key);
    return {
      key: a.key,
      label: a.label,
      max: a.max,
      score: clamp(got?.score, a.max),
      comment: typeof got?.comment === "string" ? got.comment : "",
    };
  });

  const asStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];

  const result: GradeResult = {
    total: axes.reduce((n, a) => n + a.score, 0),
    max: RUBRIC_MAX,
    axes,
    strengths: asStrings(parsed.strengths).slice(0, 5),
    improvements: asStrings(parsed.improvements).slice(0, 5),
    fixes: (Array.isArray(parsed.fixes) ? parsed.fixes : [])
      .filter((f) => f && typeof f.original === "string" && typeof f.corrected === "string")
      .slice(0, 6)
      .map((f) => ({
        original: String(f.original),
        corrected: String(f.corrected),
        reason: typeof f.reason === "string" ? f.reason : "",
      })),
    advice: typeof parsed.advice === "string" ? parsed.advice : "",
    model,
  };

  return NextResponse.json(result);
}

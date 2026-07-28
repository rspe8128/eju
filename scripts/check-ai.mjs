// OpenRouter 연결 확인.
//
//   npm run check:ai
//
// AI 채점이 안 될 때 원인이 (키인지 / 모델 슬러그인지 / 잔액인지) 바로 알 수 있게
// 실제로 한 번 호출해 본다. 아주 짧은 프롬프트라 비용은 거의 들지 않는다.
//
// .env.local 은 Next.js가 알아서 읽지만 이 스크립트는 별개로 도므로 직접 파싱한다.

import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  const out = {};
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in out)) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

const env = loadEnv();
const key = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
const model = env.OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-5";

/**
 * 모델 슬러그가 틀렸을 때, 지금 실제로 쓸 수 있는 후보를 값싼 순으로 뽑아 준다.
 * OpenRouter는 옛 모델을 조용히 내리기 때문에(claude-3.5-haiku 가 그랬다)
 * "뭘로 바꿔야 하는지"까지 알려줘야 쓸모가 있다.
 */
async function suggestModels() {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/models");
    if (!r.ok) return;
    const { data } = await r.json();
    const priced = data
      .map((m) => ({
        id: m.id,
        inp: parseFloat(m.pricing?.prompt ?? "0") * 1e6,
        out: parseFloat(m.pricing?.completion ?? "0") * 1e6,
      }))
      // 채점은 일본어 첨삭이라 너무 싼 모델은 품질이 떨어진다. 극단값만 걸러낸다.
      .filter((m) => m.out > 0 && m.out <= 12)
      .sort((a, b) => a.out - b.out)
      .slice(0, 8);
    if (priced.length === 0) return;
    console.log("\n지금 쓸 수 있는 후보 (출력 요금 낮은 순, 100만 토큰 기준):");
    for (const m of priced) {
      console.log(`  ${m.id.padEnd(38)} 입력 $${m.inp.toFixed(2)} / 출력 $${m.out.toFixed(2)}`);
    }
    console.log("\n.env.local 의 OPENROUTER_MODEL 을 위 슬러그 중 하나로 바꾸고 다시 실행하라.");
  } catch {
    console.log("\n(모델 목록을 가져오지 못했다. https://openrouter.ai/models 에서 직접 확인하라.)");
  }
}

if (!key) {
  console.log("❌ OPENROUTER_API_KEY 가 없다. .env.local 에 넣어라.");
  process.exit(1);
}
console.log(`키: ${key.slice(0, 12)}…${key.slice(-4)}`);
console.log(`모델: ${model}`);

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://eju-nu.vercel.app",
    "X-Title": "EJU Study",
  },
  body: JSON.stringify({
    model,
    max_tokens: 20,
    messages: [{ role: "user", content: '{"ok":true} 라고만 답해라.' }],
  }),
}).catch((e) => {
  console.log("❌ 연결 실패:", String(e));
  process.exit(1);
});

const text = await res.text();
if (!res.ok) {
  const hint =
    res.status === 401
      ? "키가 틀렸다."
      : res.status === 402
        ? "크레딧이 부족하다. openrouter.ai 에서 충전하라."
        : res.status === 404
          ? "모델 슬러그가 틀렸다. openrouter.ai/models 에서 확인하고 .env.local 의 OPENROUTER_MODEL 을 고쳐라."
          : res.status === 429
            ? "요청이 너무 잦다."
            : "";
  console.log(`❌ HTTP ${res.status} ${hint}`);
  console.log(text.slice(0, 400));
  if (res.status === 404) await suggestModels();
  process.exit(1);
}

const json = JSON.parse(text);
const reply = json?.choices?.[0]?.message?.content ?? "(응답 없음)";
const usage = json?.usage;
console.log(`✅ 연결 성공 — 응답: ${String(reply).trim().slice(0, 60)}`);
if (usage) console.log(`   토큰: 입력 ${usage.prompt_tokens} / 출력 ${usage.completion_tokens}`);
console.log("   이제 /writing 에서 'AI 채점 받기'가 동작한다.");

// 모의고사 문항 데이터 검증기.
//
//   npm run check:mock
//
// 문항을 추가·수정한 뒤 반드시 돌릴 것. 타입 체크로는 절대 잡히지 않는 것들을 본다.
// 특히 "정답 분포 편중"이 중요하다. 손으로 문항을 만들면 정답이 2·3번에 몰리는데,
// 그 상태로 연습하면 실전에서 감각이 어긋난다.
//
// 동작 방식: registry.ts를 임시 폴더에 CommonJS로 컴파일한 뒤 require해서 검사한다.
// (별도 런타임 의존성 없이 tsc만으로 돌아가게 하기 위함)

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const out = mkdtempSync(join(tmpdir(), "eju-mock-"));
const require = createRequire(import.meta.url);

function compile() {
  const tscBin = require.resolve("typescript/bin/tsc");
  execFileSync(
    process.execPath,
    [
      tscBin,
      "src/lib/mock/registry.ts",
      "src/lib/examTopics.ts",
      "--ignoreConfig",
      "--ignoreDeprecations",
      "6.0",
      "--outDir",
      out,
      "--module",
      "commonjs",
      "--target",
      "es2020",
      "--moduleResolution",
      "node",
      "--skipLibCheck",
      "--esModuleInterop",
    ],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
}

let errors = 0;
const fail = (m) => {
  errors++;
  console.log("  ✗ " + m);
};

function main() {
  compile();
  const { MOCK_PAPERS } = require(join(out, "mock", "registry.js"));
  const { EXAM_TOPICS } = require(join(out, "examTopics.js"));

  const seenIds = new Set();
  const seenBodies = new Map();

  for (const paper of MOCK_PAPERS) {
    console.log(`\n[${paper.id}] ${paper.title}`);
    const validTopics = new Set((EXAM_TOPICS[paper.subjectCode] ?? []).map((t) => t.id));
    if (validTopics.size === 0) fail(`${paper.id}: examTopics에 과목 ${paper.subjectCode}가 없다`);

    for (const s of paper.sections) {
      const passageIds = new Set(s.passages.map((p) => p.id));

      for (const p of s.passages) {
        if (seenIds.has(p.id)) fail(`중복 id: ${p.id}`);
        seenIds.add(p.id);

        const hasScript = (p.scriptJa?.length ?? 0) > 0;
        // 청해는 시험지에 인쇄되는 본문이 없다(ja: []). 대신 음성 스크립트가 있어야 한다.
        if (p.ja.length === 0 && !p.table && !hasScript) fail(`빈 지문: ${p.id}`);
        for (const para of p.ja) if (!para.trim()) fail(`빈 문단: ${p.id}`);

        if (hasScript) {
          for (const line of p.scriptJa) if (!line.trim()) fail(`${p.id}: 빈 스크립트 줄`);
          const slen = p.scriptJa.join("").length;
          if (slen < 60) fail(`${p.id}: 음성 스크립트가 너무 짧다 (${slen}자)`);
          // 「〜について話しています」처럼 무엇을 들을지 알려주는 도입이 있어야 한다
          if (!p.leadJa || !p.leadJa.trim()) fail(`${p.id}: 음성 문항인데 leadJa(상황 설명)가 없다`);
        }

        const len = p.ja.join("").length;
        if (p.kind === "prose" && len < 120) fail(`${p.id}: 지문이 너무 짧다 (${len}자)`);

        const body = p.ja.join("");
        if (body && seenBodies.has(body)) fail(`지문 중복: ${p.id} == ${seenBodies.get(body)}`);
        if (body) seenBodies.set(body, p.id);
      }

      const dist = {};
      const numbers = [];
      for (const q of s.questions) {
        if (seenIds.has(q.id)) fail(`중복 id: ${q.id}`);
        seenIds.add(q.id);
        if (q.passageId && !passageIds.has(q.passageId))
          fail(`${q.id}: 없는 지문 참조 ${q.passageId}`);
        if (!q.stemJa.trim()) fail(`${q.id}: 발문이 비어 있다`);

        const keys = q.choices.map((c) => c.key);
        if (new Set(keys).size !== keys.length) fail(`${q.id}: 선택지 key 중복`);
        if (!keys.includes(q.answer)) fail(`${q.id}: 정답 ${q.answer}이(가) 선택지에 없다`);
        if (q.choices.length < 3) fail(`${q.id}: 선택지가 ${q.choices.length}개뿐`);
        for (const c of q.choices) if (!c.ja.trim()) fail(`${q.id}: 빈 선택지 ${c.key}`);
        const texts = q.choices.map((c) => c.ja.trim());
        if (new Set(texts).size !== texts.length) fail(`${q.id}: 선택지 본문 중복`);

        if (!q.explanationKo || q.explanationKo.length < 30) fail(`${q.id}: 해설이 너무 짧다`);
        if (!validTopics.has(q.topicId)) fail(`${q.id}: 알 수 없는 topicId ${q.topicId}`);

        numbers.push(q.number);
        dist[q.answer] = (dist[q.answer] ?? 0) + 1;
      }

      if (s.questions.length > 0) {
        const sorted = [...numbers].sort((a, b) => a - b);
        if (sorted.some((n, i) => n !== i + 1))
          fail(`${s.id}: 문항 번호가 1..n 연속이 아니다 (${sorted.join(",")})`);
        if (JSON.stringify(numbers) !== JSON.stringify(sorted))
          fail(`${s.id}: 문항이 번호순으로 나열돼 있지 않다`);

        const total = s.questions.length;
        const maxShare = Math.max(...Object.values(dist)) / total;
        const shown = Object.entries(dist)
          .sort()
          .map(([k, v]) => `${k}:${v}`)
          .join(" ");
        console.log(
          `  ${s.label}: ${total}문항 · 정답분포 ${shown} · 최대편중 ${Math.round(maxShare * 100)}%`
        );
        if (maxShare > 0.45)
          fail(`${s.id}: 정답이 한쪽에 치우쳤다 (${Math.round(maxShare * 100)}%)`);

        let run = 1;
        for (let i = 1; i < s.questions.length; i++) {
          if (s.questions[i].answer === s.questions[i - 1].answer) {
            run++;
            if (run >= 4) fail(`${s.id}: ${s.questions[i].number}번 부근에 같은 답이 4연속`);
          } else {
            run = 1;
          }
        }
      }

      if (s.kind === "writing") {
        const prompts = s.writingPrompts ?? [];
        for (const w of prompts) {
          if (w.ja.length < 60) fail(`${w.id}: 기술 주제문이 너무 짧다`);
          if ((w.checklistKo ?? []).length < 4) fail(`${w.id}: 체크리스트 항목이 부족하다`);
        }
        console.log(`  ${s.label}: 주제 ${prompts.length}개`);
      }
    }
  }

  console.log(errors === 0 ? "\n✅ 검증 통과 — 오류 0건" : `\n❌ 오류 ${errors}건`);
}

try {
  main();
} finally {
  rmSync(out, { recursive: true, force: true });
}

process.exit(errors === 0 ? 0 : 1);

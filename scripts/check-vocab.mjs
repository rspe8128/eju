// 단어장 보관함 검증기.
//
//   npm run check:vocab
//
// 목록 화면은 단어 파일을 열지 않고 미리 적어 둔 count만 보여준다. 그래서 count가
// 실제 배열 길이와 어긋나도 화면에서는 티가 안 난다. 그걸 여기서 잡는다.
//
// 확인 항목
//  · 덱 id 중복
//  · count와 실제 단어 수가 일치하는지
//  · 같은 단어가 두 덱에 들어가 있지 않은지 (JLPT는 레벨 전체를 하나로 보고 검사)
//  · 단어 항목의 모양(표제어·뜻이 비어 있지 않은지)
//  · 전부 담았을 때 localStorage 용량이 한도 안에 들어오는지
//
// registry 검증(check-mock.mjs)과 같은 방식으로 tsc → CommonJS 컴파일 후 require 한다.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const out = mkdtempSync(join(tmpdir(), "eju-vocab-"));
const require = createRequire(import.meta.url);

let errors = 0;
const fail = (m) => {
  errors++;
  console.log("  ✗ " + m);
};

function compile() {
  const tscBin = require.resolve("typescript/bin/tsc");
  execFileSync(
    process.execPath,
    [
      tscBin,
      "src/lib/data/vocab/library.ts",
      "src/lib/storage/codec.ts",
      "src/lib/seed.ts",
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
      "--resolveJsonModule",
    ],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
}

async function main() {
  compile();
  const { LIBRARY_DECKS, LIBRARY_TOTAL, libraryGroups } = require(
    join(out, "data", "vocab", "library.js")
  );
  const { encodeData } = require(join(out, "storage", "codec.js"));
  const { getSeedData } = require(join(out, "seed.js"));

  const seed = getSeedData();
  if (seed.decks.length !== 0 || seed.cards.length !== 0) {
    fail(
      `시드에 덱 ${seed.decks.length}개·카드 ${seed.cards.length}장이 남아 있다. ` +
        `보관함으로 옮겼으므로 비어 있어야 한다.`
    );
  }

  const ids = new Set();
  const wordOwner = new Map();
  /** 덱을 넘나드는 겹침을 참고용으로 세기 위한 목록 */
  const allWords = [];
  const data = { ...seed, decks: [...seed.decks], cards: [...seed.cards] };

  for (const g of libraryGroups()) {
    let groupTotal = 0;
    for (const deck of g.decks) {
      if (ids.has(deck.id)) fail(`덱 id 중복: ${deck.id}`);
      ids.add(deck.id);

      const words = await deck.load();
      if (words.length !== deck.count) {
        fail(`${deck.id}: count ${deck.count} ≠ 실제 ${words.length}`);
      }
      groupTotal += words.length;

      for (const w of words) {
        if (!Array.isArray(w)) {
          fail(`${deck.id}: 단어 항목이 배열이 아니다`);
          break;
        }
        if (!w[0] || !String(w[0]).trim()) fail(`${deck.id}: 표제어가 비었다`);
        if (!w[2] || !String(w[2]).trim()) fail(`${deck.id}: 뜻이 비었다 (${w[0]})`);

        // 표제어·읽기·뜻이 **모두** 같을 때만 중복으로 본다.
        // 표기가 같아도 뜻이 다르면 별개 단어다 (そば = 곁 / 메밀국수,
        // できる = 생기다 / 할 수 있다). 동음이의어는 따로 외워야 하므로 정상이다.
        //
        // 검사 범위
        //  · JLPT N3·N2·N1 — 레벨끼리 겹치면 오류. 같은 단어를 두 번 외울 이유가 없다.
        //  · 그 외 — 덱 안에서만 본다. 과목 용어는 수학·물리에 같은 용어가 나오는 게
        //    정상이고, "일본어 기초 단어 100"은 N5 전체에서 입문용으로 추린
        //    의도된 부분집합이라 겹치는 게 맞다(예문이 붙어 있다는 점이 다르다).
        const strictScope = /^JLPT N[123]$/.test(g.group);
        const key = `${strictScope ? "JLPT" : deck.id}|${w[0]}|${w[1] ?? ""}|${w[2]}`;
        if (wordOwner.has(key)) {
          fail(`단어 중복: "${w[0]}" (${w[2]}) — ${deck.id} 와 ${wordOwner.get(key)}`);
        } else {
          wordOwner.set(key, deck.id);
        }
        allWords.push([`${w[0]}|${w[1] ?? ""}|${w[2]}`, deck.id, g.group]);

        data.cards.push({
          id: `probe-${data.cards.length}`,
          deckId: deck.id,
          front: w[0],
          back: w[2],
          reading: w[1] || undefined,
          exampleSentence: w[3] || undefined,
          notes: w[4] || undefined,
          tags: w[5] ?? [],
          srs: {
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: "2026-01-01",
          },
        });
      }
      data.decks.push(deck);
    }
    console.log(
      `  ${g.group.padEnd(14)} ${String(g.decks.length).padStart(2)}권 · ${groupTotal.toLocaleString()}단어`
    );
  }

  const declared = LIBRARY_DECKS.reduce((n, d) => n + d.count, 0);
  if (declared !== LIBRARY_TOTAL) fail(`LIBRARY_TOTAL 불일치: ${LIBRARY_TOTAL} ≠ ${declared}`);

  // 덱을 넘나드는 겹침 — 오류는 아니지만 얼마나 되는지는 알고 있어야 한다.
  // (두 덱을 다 담으면 그만큼은 같은 단어를 두 번 보게 된다)
  const owners = new Map();
  for (const [key, deckId] of allWords) {
    if (!owners.has(key)) owners.set(key, new Set());
    owners.get(key).add(deckId);
  }
  const overlaps = [...owners.values()].filter((s) => s.size > 1).length;
  if (overlaps > 0) {
    console.log(
      `\n  참고: 서로 다른 덱에 같은 단어가 있는 경우 ${overlaps}건.` +
        ` 대부분 "일본어 기초 단어 100"이 N5 전체와 겹치는 것으로, 의도된 구성이다.`
    );
  }

  const chars = JSON.stringify(encodeData(data)).length;
  const mb = (chars * 2) / 1024 / 1024;
  console.log(
    `\n  전체 ${LIBRARY_DECKS.length}권 · ${LIBRARY_TOTAL.toLocaleString()}단어 · ` +
      `${data.cards.length.toLocaleString()}장`
  );
  console.log(`  전부 담았을 때 저장량 ${mb.toFixed(2)}MB / 5.00MB (${Math.round((mb / 5) * 100)}%)`);
  if (mb > 4.5) fail(`저장 한도에 너무 가깝다 (${mb.toFixed(2)}MB). 덱을 줄이거나 압축을 개선할 것.`);

  console.log(errors === 0 ? "\n✅ 검증 통과 — 오류 0건" : `\n❌ 오류 ${errors}건`);
}

try {
  await main();
} finally {
  rmSync(out, { recursive: true, force: true });
}

process.exit(errors === 0 ? 0 : 1);

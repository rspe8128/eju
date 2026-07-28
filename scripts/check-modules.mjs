import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const out = mkdtempSync(join(tmpdir(), "eju-modules-"));
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
      "src/lib/data/subjects/modules.ts",
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

function main() {
  compile();
  const { STUDY_MODULES } = require(join(out, "data", "subjects", "modules.js"));
  const { encodeData } = require(join(out, "storage", "codec.js"));
  const { getSeedData } = require(join(out, "seed.js"));

  const seed = getSeedData();
  if (seed.units.length !== 0 || seed.items.length !== 0) {
    fail(`시드 units/items는 비어 있어야 한다 (${seed.units.length}/${seed.items.length})`);
  }

  const moduleIds = new Set();
  const unitIds = new Set();
  const itemIds = new Set();
  const data = { ...seed, units: [...seed.units], items: [...seed.items] };

  for (const mod of STUDY_MODULES) {
    if (moduleIds.has(mod.id)) fail(`모듈 id 중복: ${mod.id}`);
    moduleIds.add(mod.id);

    const built = mod.build();
    if (unitIds.has(built.unit.id)) fail(`unit id 중복: ${built.unit.id}`);
    unitIds.add(built.unit.id);
    data.units.push(built.unit);

    const conceptCount = built.items.filter((item) => item.type === "concept").length;
    const problemCount = built.items.filter((item) => item.type === "problem").length;
    if (conceptCount !== mod.conceptCount) {
      fail(`${mod.id}: conceptCount ${mod.conceptCount} ≠ 실제 ${conceptCount}`);
    }
    if (problemCount !== mod.problemCount) {
      fail(`${mod.id}: problemCount ${mod.problemCount} ≠ 실제 ${problemCount}`);
    }

    for (const item of built.items) {
      if (itemIds.has(item.id)) fail(`item id 중복: ${item.id}`);
      itemIds.add(item.id);
      if (item.type === "concept") {
        if (!item.markdown?.trim()) fail(`${item.id}: 개념 markdown 비어 있음`);
      } else {
        if (!item.question?.trim()) fail(`${item.id}: 문제 question 비어 있음`);
        if (!item.answer?.trim()) fail(`${item.id}: 문제 answer 비어 있음`);
        if (!item.explanation?.trim()) fail(`${item.id}: 문제 explanation 비어 있음`);
      }
      data.items.push(item);
    }
  }

  const chars = JSON.stringify(encodeData(data)).length;
  const mb = (chars * 2) / 1024 / 1024;
  console.log(
    `  전체 ${STUDY_MODULES.length}모듈 · ${data.units.length}단원 · ${data.items.length}항목`
  );
  console.log(`  전부 담았을 때 저장량 ${mb.toFixed(2)}MB / 5.00MB (${Math.round((mb / 5) * 100)}%)`);
  console.log(errors === 0 ? "\n✅ 검증 통과 — 오류 0건" : `\n❌ 오류 ${errors}건`);
}

try {
  main();
} finally {
  rmSync(out, { recursive: true, force: true });
}

process.exit(errors === 0 ? 0 : 1);

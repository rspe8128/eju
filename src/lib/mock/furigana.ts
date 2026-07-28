/**
 * 지문 후리가나 — 단어장에 있는 (표기, 읽기)만 붙인다.
 * 틀린 읽기를 찍는 것보다 빈칸이 낫다.
 */

import { jlptN5FullWords } from "@/lib/data/jlptN5FullWords";
import { jlptN4Words } from "@/lib/data/jlptN4Words";
import type { WordEntry } from "@/lib/data/japaneseWords";

const HAS_KANJI = /[\u4e00-\u9fff]/;

function buildReadingMap(lists: WordEntry[][]): Map<string, string> {
  const map = new Map<string, string>();
  for (const list of lists) {
    for (const row of list) {
      const [front, reading] = row;
      if (!front || !reading) continue;
      if (!HAS_KANJI.test(front)) continue;
      // 짧은 항목이 긴 항목을 가리지 않도록, 이미 긴 게 있으면 유지
      const prev = map.get(front);
      if (!prev) map.set(front, reading.split("/")[0]!.trim());
    }
  }
  return map;
}

let cached: { map: Map<string, string>; keys: string[] } | null = null;

function dict() {
  if (!cached) {
    const map = buildReadingMap([jlptN5FullWords, jlptN4Words]);
    const keys = [...map.keys()].sort((a, b) => b.length - a.length);
    cached = { map, keys };
  }
  return cached;
}

export type FuriganaChunk =
  | { type: "text"; text: string }
  | { type: "ruby"; text: string; reading: string };

/** 최장일치로 한자어에 읽기를 붙인다. */
export function annotateFurigana(text: string): FuriganaChunk[] {
  const { map, keys } = dict();
  const out: FuriganaChunk[] = [];
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const key of keys) {
      if (text.startsWith(key, i)) {
        const reading = map.get(key);
        if (reading) {
          out.push({ type: "ruby", text: key, reading });
          i += key.length;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    // 매칭 안 되면 다음 문자(또는 연속 비한자)를 일반 텍스트로
    const start = i;
    i += 1;
    while (i < text.length) {
      // 다음 위치에서 사전이 맞을 수 있으면 중단
      let canMatch = false;
      for (const key of keys) {
        if (text.startsWith(key, i)) {
          canMatch = true;
          break;
        }
      }
      if (canMatch) break;
      i += 1;
    }
    out.push({ type: "text", text: text.slice(start, i) });
  }
  return out;
}

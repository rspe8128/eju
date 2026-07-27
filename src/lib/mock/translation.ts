"use client";

/**
 * 일본어 → 한국어 번역 캐시.
 *
 * 왜 캐시가 필요한가: DeepL 무료 플랜은 월 50만 자다. 모의고사 지문 하나가
 * 400~1,500자이므로, 번역 버튼을 누를 때마다 새로 보내면 금방 한도를 태운다.
 * 같은 문장은 몇 번을 눌러도 딱 한 번만 DeepL에 간다.
 *
 * 저장 위치: localStorage. 문항 데이터는 앱과 함께 배포되는 고정 문자열이므로,
 * 한 번 번역해 두면 다음에 열 때도 그대로 쓸 수 있다.
 */

const CACHE_KEY = "eju.translation.ja-ko.v1";
/** 항목이 이보다 많아지면 오래된 것부터 버린다 (localStorage 용량 보호). */
const MAX_ENTRIES = 2000;

type CacheShape = Record<string, { t: string; at: number }>;

/** djb2 — 짧고 충돌이 드물다. 캐시 키 용도로 충분하다. */
function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  // 길이를 붙여 충돌 확률을 한 번 더 낮춘다
  return `${(h >>> 0).toString(36)}_${text.length}`;
}

function readCache(): CacheShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheShape;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: CacheShape) {
  if (typeof window === "undefined") return;
  try {
    let next = cache;
    const keys = Object.keys(cache);
    if (keys.length > MAX_ENTRIES) {
      // 오래된 순으로 잘라낸다
      const sorted = keys
        .map((k) => [k, cache[k].at] as const)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_ENTRIES);
      next = {};
      for (const [k] of sorted) next[k] = cache[k];
    }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // 용량 초과 등으로 실패하면 캐시를 통째로 비우고 조용히 넘어간다.
    try {
      window.localStorage.removeItem(CACHE_KEY);
    } catch {
      /* noop */
    }
  }
}

export function getCached(text: string): string | null {
  const c = readCache();
  return c[hash(text)]?.t ?? null;
}

export function cachedCount(): number {
  return Object.keys(readCache()).length;
}

export function clearTranslationCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* noop */
  }
}

export class TranslationError extends Error {}

/**
 * 여러 문자열을 한 번에 번역한다. 입력과 **같은 길이·같은 순서**로 돌려준다.
 * 캐시에 있는 것은 건너뛰고, 없는 것만 서버로 보낸다.
 */
export async function translateMany(texts: string[]): Promise<string[]> {
  const cache = readCache();
  const out = new Array<string>(texts.length).fill("");
  const missing: { text: string; idx: number }[] = [];

  texts.forEach((text, i) => {
    if (!text.trim()) {
      out[i] = "";
      return;
    }
    const hit = cache[hash(text)];
    if (hit) {
      out[i] = hit.t;
    } else {
      missing.push({ text, idx: i });
    }
  });

  if (missing.length === 0) return out;

  // 같은 문자열이 여러 번 들어와도 DeepL에는 한 번만 보낸다.
  const uniqueTexts = [...new Set(missing.map((m) => m.text))];

  let res: Response;
  try {
    res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: uniqueTexts, sourceLang: "JA", targetLang: "KO" }),
    });
  } catch {
    throw new TranslationError("서버에 연결하지 못했습니다. 개발 서버가 켜져 있는지 확인하세요.");
  }

  const json = (await res.json().catch(() => ({}))) as { texts?: string[]; error?: string };
  if (!res.ok) {
    throw new TranslationError(json.error ?? "번역에 실패했습니다.");
  }

  const translated = json.texts ?? [];
  const byText = new Map<string, string>();
  uniqueTexts.forEach((t, i) => byText.set(t, translated[i] ?? ""));

  const now = Date.now();
  for (const m of missing) {
    const t = byText.get(m.text) ?? "";
    out[m.idx] = t;
    if (t) cache[hash(m.text)] = { t, at: now };
  }
  writeCache(cache);

  return out;
}

"use client";

import { useEffect, useState } from "react";

export type SpeechLang = "ja" | "en";

/** 문자열에 일본어(히라가나·가타카나·한자)가 섞여 있으면 일본어로 본다. */
export function detectLang(text: string): SpeechLang {
  return /[぀-ヿ㐀-䶿一-鿿]/.test(text) ? "ja" : "en";
}

const LANG_TAG: Record<SpeechLang, string> = { ja: "ja-JP", en: "en-US" };

/**
 * 브라우저 내장 Web Speech API로 음성을 재생한다.
 * 별도 API 키·비용 없이 클라이언트에서만 동작하며, 미지원 환경에서는 조용히 무시된다.
 */
export function speak(text: string, opts: { lang?: SpeechLang; rate?: number } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const lang = opts.lang ?? detectLang(text);
  const tag = LANG_TAG[lang];

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = tag;
  utterance.rate = opts.rate ?? 1;

  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((v) => v.lang === tag) ??
    voices.find((v) => v.lang.replace("_", "-").startsWith(lang));
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

/** SSR 환경에서 hydration 불일치가 나지 않도록 마운트 후에만 true가 된다. */
export function useSpeechSupport(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);
  return supported;
}

import type { MockSection } from "../types";

/**
 * 청독해·청해 자리표.
 *
 * 아직 문항을 넣지 않았다. 섹션 자체를 남겨 두는 이유는 두 가지다.
 *  1) 실전 시간표(총 125분)와 화면 구성을 유지하기 위해
 *  2) 나중에 문항을 채울 때 UI를 손대지 않아도 되도록
 * questions가 비어 있으면 registry의 isSectionReady()가 false를 돌려주고,
 * 목록 화면이 "준비 중"으로 잠근다.
 */
export function listeningChartPlaceholder(): MockSection {
  return {
    id: "listening-chart",
    label: "청독해 (聴読解)",
    kind: "listening-chart",
    minutes: 20,
    instructionsJa:
      "聴読解の問題は、問題冊子に印刷されている図表などを見ながら、音声を聞いて答えます。音声は一度だけ流れます。",
    hintKo: "준비 중 — 음성 문항은 아직 넣지 않았다.",
    passages: [],
    questions: [],
  };
}

export function listeningPlaceholder(): MockSection {
  return {
    id: "listening",
    label: "청해 (聴解)",
    kind: "listening",
    minutes: 35,
    instructionsJa:
      "聴解の問題は、音声だけを聞いて答えます。問題冊子には選択肢が印刷されています。音声は一度だけ流れます。",
    hintKo: "준비 중 — 음성 문항은 아직 넣지 않았다.",
    passages: [],
    questions: [],
  };
}

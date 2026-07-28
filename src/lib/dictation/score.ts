/**
 * 딕테이션 채점 — 글자 단위 비교.
 *
 * 예전에는 정답 문자열과 완전히 같은지만 봤다. 한 글자만 틀려도 "오답"이고,
 * **어디를 못 들었는지는 알려주지 않았다.** 받아쓰기에서 가장 중요한 정보가
 * 바로 그것인데도.
 *
 * 여기서는 LCS(최장 공통 부분 수열)로 두 문장을 맞춰 보고,
 * 맞은 글자 / 빠뜨린 글자 / 잘못 쓴 글자를 구간별로 돌려준다.
 * 화면에서는 이걸 색으로 칠해 보여준다.
 */

export type DiffOp = "same" | "missing" | "extra";

export type DiffSegment = {
  op: DiffOp;
  /** same·missing이면 정답 쪽 글자, extra면 내가 쓴 글자 */
  text: string;
};

export type DictationScore = {
  segments: DiffSegment[];
  /** 정답 글자 중 맞힌 비율 (0~1) */
  accuracy: number;
  correctChars: number;
  totalChars: number;
  missingChars: number;
  extraChars: number;
  perfect: boolean;
};

/**
 * 채점 전 정규화.
 *
 * 듣고 받아쓴 것이므로, 들리지 않는 요소는 틀린 것으로 치지 않는다.
 *  · 공백·줄바꿈 — 일본어는 원래 띄어쓰기를 하지 않는다
 *  · 구두점(、。！？「」) — 소리로는 구분되지 않는다
 *  · 전각/반각 숫자·영문 — 표기 차이일 뿐이다
 */
export function normalizeForScoring(text: string): string {
  return text
    .replace(/\s+/g, "")
    .replace(/[、。，．・！？!?「」『』（）()"'…―ー─]/g, (m) => (m === "ー" ? "ー" : ""))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase();
}

/**
 * LCS 표를 만들어 되짚어 가며 구간을 뽑는다.
 * 문장 하나(길어야 100자쯤)를 다루므로 O(n·m)으로 충분하다.
 */
function diffChars(answer: string, input: string): DiffSegment[] {
  const n = answer.length;
  const m = input.length;
  // dp[i][j] = answer[i..], input[j..] 의 LCS 길이
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        answer[i] === input[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const raw: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (answer[i] === input[j]) {
      raw.push({ op: "same", text: answer[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ op: "missing", text: answer[i] });
      i++;
    } else {
      raw.push({ op: "extra", text: input[j] });
      j++;
    }
  }
  while (i < n) raw.push({ op: "missing", text: answer[i++] });
  while (j < m) raw.push({ op: "extra", text: input[j++] });

  // 같은 종류가 이어지면 한 덩어리로 합친다 (화면에서 글자마다 span을 만들지 않으려고)
  const merged: DiffSegment[] = [];
  for (const seg of raw) {
    const last = merged[merged.length - 1];
    if (last && last.op === seg.op) last.text += seg.text;
    else merged.push({ ...seg });
  }
  return merged;
}

export function scoreDictation(answer: string, input: string): DictationScore {
  const a = normalizeForScoring(answer);
  const b = normalizeForScoring(input);
  const segments = diffChars(a, b);

  let correctChars = 0;
  let missingChars = 0;
  let extraChars = 0;
  for (const s of segments) {
    if (s.op === "same") correctChars += s.text.length;
    else if (s.op === "missing") missingChars += s.text.length;
    else extraChars += s.text.length;
  }

  const totalChars = a.length;
  return {
    segments,
    accuracy: totalChars === 0 ? 0 : correctChars / totalChars,
    correctChars,
    totalChars,
    missingChars,
    extraChars,
    perfect: missingChars === 0 && extraChars === 0 && totalChars > 0,
  };
}

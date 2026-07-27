import type { AnswerKey } from "../types";
import { UNTAGGED } from "../examTopics";

/**
 * 2018년 제1회 EJU 공식 정답표 (JASSO 공개 PDF 기준).
 * 출처: https://www.jasso.go.jp/.../2018_1answer_e202512_1.pdf
 *
 * 일본어 독해·청독해는 저작권상 웹 게재 허가를 받은 문항만 정답이 공개되어 있다.
 * 빈 문자열("")은 미공개 — 채점 시 자동으로 제외된다 (ExamResult).
 */

function key(
  paperId: string,
  subjectCode: string,
  answers: string[]
): AnswerKey {
  return {
    id: `${paperId}:${subjectCode}`,
    paperId,
    subjectCode,
    answers,
    topics: answers.map(() => UNTAGGED),
    updatedAt: "2018-06-01T00:00:00.000Z",
  };
}

const PAPER = "2018-1";

/** 読解 25 + 聴読解 12 + 聴解 15 = 52 */
const JAPANESE_READING: string[] = [
  "", // 1
  "2", // 2
  "",
  "",
  "4", // 5
  "",
  "",
  "",
  "",
  "4", // 10
  "2", // 11
  "4", // 12
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "1", // 23
  "1", // 24
  "3", // 25
];

const JAPANESE_LISTENING_READING: string[] = [
  "",
  "",
  "",
  "3", // 4番
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
];

const JAPANESE_LISTENING: string[] = [
  "1", // 13
  "3",
  "1",
  "2",
  "2",
  "4",
  "4",
  "1",
  "2",
  "2",
  "4",
  "4",
  "2",
  "4",
  "3", // 27
];

/** 総合科目 解答番号 1~38 */
const SOGO: string[] = [
  "3",
  "4",
  "1",
  "2",
  "2",
  "4",
  "2",
  "4",
  "1",
  "3",
  "2",
  "1",
  "2",
  "1",
  "3",
  "3",
  "4",
  "2",
  "4",
  "1",
  "1",
  "3",
  "4",
  "1",
  "4",
  "3",
  "2",
  "2",
  "3",
  "1",
  "3",
  "3",
  "4",
  "2",
  "4",
  "3",
  "2",
  "1",
];

const PHYSICS: string[] = [
  "5",
  "6",
  "6",
  "3",
  "3",
  "1",
  "4",
  "3",
  "4",
  "6",
  "2",
  "2",
  "5",
  "1",
  "5",
  "1",
  "3",
  "4",
  "2",
];

const CHEMISTRY: string[] = [
  "6",
  "5",
  "2",
  "5",
  "2",
  "3",
  "2",
  "3",
  "1",
  "4",
  "3",
  "1",
  "2",
  "1",
  "4",
  "3",
  "4",
  "4",
  "3",
  "4",
];

const BIOLOGY: string[] = [
  "2",
  "5",
  "2",
  "2",
  "3",
  "1",
  "1",
  "2",
  "3",
  "3",
  "5",
  "4",
  "4",
  "3",
  "5",
  "1",
  "4",
  "6",
];

/**
 * 수학은 마크시트 숫자칸을 칸 단위(0~9)로 펼친다.
 * 부호칸은 "s"로 표시하고 UI에서 − 로 고르게 한다. (없으면 양수)
 * Course1 / Course2 공통 I단원 포함.
 */
const MATH1_DIGITS: string[] = [
  // I-1 AB CDE FG H I
  "4",
  "2",
  "4",
  "5",
  "1",
  "1",
  "4",
  "1",
  "1",
  // I-2 JKLM NOP QR ST UVW XY
  "1",
  "5",
  "1",
  "1",
  "2",
  "5",
  "6",
  "2",
  "4",
  "1",
  "2",
  "1",
  "4",
  "4",
  "8",
  "4",
  // II-1 AB C D E FGH I
  "1",
  "8",
  "1",
  "3",
  "3",
  "3",
  "3",
  "6",
  "3",
  // II-2 JKL MN(−1) OP(−2) Q RS TU(−2) V WX
  "3",
  "5",
  "2",
  "s",
  "1",
  "s",
  "2",
  "4",
  "1",
  "2",
  "s",
  "2",
  "1",
  "1",
  "7",
  // III
  "6",
  "6",
  "6",
  "5",
  "2",
  "3",
  "6",
  "1",
  "1",
  "5",
  "5",
  "6",
  "1",
  "6",
  "1",
  "1",
  "2",
  "3",
  "4",
  "3",
  // IV
  "1",
  "2",
  "2",
  "3",
  "9",
  "4",
  "2",
  "3",
  "5",
  "2",
  "3",
  "5",
  "7",
  "4",
  "7",
  "9",
  "7",
  "3",
  "2",
  "5",
];

const MATH2_DIGITS: string[] = [
  // I (Course1과 동일)
  "4",
  "2",
  "4",
  "5",
  "1",
  "1",
  "4",
  "1",
  "1",
  "1",
  "5",
  "1",
  "1",
  "2",
  "5",
  "6",
  "2",
  "4",
  "1",
  "2",
  "1",
  "4",
  "4",
  "8",
  "4",
  // II-1 A BC D EF GHIJK L
  "3",
  "3",
  "2",
  "0",
  "2",
  "1",
  "9",
  "2",
  "1",
  "1",
  "7",
  "4",
  // II-2 MNOP QRS T U VW X
  "1",
  "4",
  "6",
  "0",
  "0",
  "6",
  "5",
  "0",
  "7",
  "2",
  "4",
  "2",
  // III ABC DE F GH IJ KLMN OP QRST U VWXY
  "2",
  "1",
  "4",
  "1",
  "2",
  "1",
  "2",
  "6",
  "8",
  "1",
  "2",
  "3",
  "1",
  "3",
  "1",
  "3",
  "5",
  "5",
  "2",
  "7",
  "2",
  "2",
  "2",
  "1",
  "5",
  // IV A BCDEFGHI JKL MN OPQR ST U
  "4",
  "1",
  "3",
  "3",
  "2",
  "1",
  "3",
  "3",
  "2",
  "1",
  "3",
  "2",
  "1",
  "6",
  "6",
  "3",
  "5",
  "7",
  "9",
  "6",
  "1",
];

export const BUILTIN_ANSWER_KEYS: AnswerKey[] = [
  key(PAPER, "japanese", [
    ...JAPANESE_READING,
    ...JAPANESE_LISTENING_READING,
    ...JAPANESE_LISTENING,
  ]),
  key(PAPER, "sogo", SOGO),
  key(PAPER, "physics", PHYSICS),
  key(PAPER, "chemistry", CHEMISTRY),
  key(PAPER, "biology", BIOLOGY),
  key(PAPER, "math1", MATH1_DIGITS),
  key(PAPER, "math2", MATH2_DIGITS),
];

/** 이미 있는 키는 덮어쓰지 않고, 없는 키만 추가 */
export function mergeBuiltinAnswerKeys(existing: AnswerKey[]): AnswerKey[] {
  const ids = new Set(existing.map((k) => k.id));
  const extras = BUILTIN_ANSWER_KEYS.filter((k) => !ids.has(k.id));
  return extras.length === 0 ? existing : [...existing, ...extras];
}

import raw from "./sentences.json";

/**
 * 딕테이션 연습 문장.
 *
 * 예전에는 이 기능에 콘텐츠가 하나도 없었다. 연습하려면 사용자가 일본어 정답 문장을
 * 직접 타이핑해서 등록해야 했는데, 일본어를 배우려는 사람이 받아쓰기용 문장을
 * 어디서 구해 오나 — 순환 문제라 화면은 늘 비어 있었다. 그래서 문장을 넣었다.
 *
 * 난이도는 EJU 청해 흐름에 맞췄다.
 *  · 레벨1 일상·캠퍼스 회화 (평균 14자) — 받아쓰기에 익숙해지는 단계
 *  · 레벨2 안내문·설명 (평균 26자) — 숫자·조건이 섞여 나온다
 *  · 레벨3 강의·논설 (평균 39자) — 실제 청해·청독해에 가까운 문어체
 *
 * 전부 자체 집필이라 저작권 문제가 없다. 기출 음원은 쓸 수 없다.
 * 데이터는 .json 에 두었다 — 배열 리터럴로 쓰면 tsc가 튜플 검사에 오래 걸린다.
 */

export type DictationSentence = {
  id: string;
  level: 1 | 2 | 3;
  topic: string;
  /** 정답 문장 (일본어) */
  ja: string;
  /** 뜻 — 채점 후에만 보여준다 */
  ko: string;
};

export const DICTATION_SENTENCES = raw as DictationSentence[];

export const DICTATION_LEVELS: { level: 1 | 2 | 3; label: string; hint: string }[] = [
  {
    level: 1,
    label: "레벨 1 · 일상·캠퍼스 회화",
    hint: "짧은 문장으로 받아쓰기 자체에 익숙해지는 단계. 조사와 문말을 정확히 듣자.",
  },
  {
    level: 2,
    label: "레벨 2 · 안내문·설명",
    hint: "숫자·시각·조건이 섞여 나온다. 실전 청해에서 가장 자주 놓치는 부분이다.",
  },
  {
    level: 3,
    label: "레벨 3 · 강의·논설",
    hint: "실제 청해·청독해에 가까운 문어체. 한 번에 다 못 들어도 정상이다.",
  },
];

export function sentencesByLevel(level: 1 | 2 | 3): DictationSentence[] {
  return DICTATION_SENTENCES.filter((s) => s.level === level);
}

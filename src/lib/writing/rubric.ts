/**
 * EJU 記述(작문) 채점 기준.
 *
 * JASSO는 세부 채점표를 공개하지 않는다. 공개된 것은 "0~50점 척도"와,
 * 채점 관점이 (1) 과제에 제대로 답했는가 (2) 논지가 구성되어 있는가
 * (3) 일본어가 정확한가 — 이 세 축이라는 점뿐이다.
 * 아래는 그 세 축을 기준으로 만든 것으로, 공식 채점표가 아니라 연습용 근사치다.
 *
 * AI 채점(api/grade-writing)과 규칙 검사(analyze.ts)가 같은 기준을 쓰도록
 * 여기 한 곳에 모아 둔다.
 */

export type RubricAxis = {
  key: "task" | "structure" | "language";
  label: string;
  max: number;
  /** 이 축에서 무엇을 보는지 — AI 프롬프트에 그대로 들어간다 */
  criteria: string[];
};

export const WRITING_RUBRIC: RubricAxis[] = [
  {
    key: "task",
    label: "과제 대응",
    max: 20,
    criteria: [
      "문제가 요구한 것을 빠짐없이 다뤘는가 (両面型이면 좋은 면과 문제점을 모두, 選択型이면 한쪽을 분명히 고름)",
      "'둘 다 중요하다'처럼 지시를 피해 가지 않았는가",
      "주제에서 벗어난 이야기로 분량을 채우지 않았는가",
      "자신의 입장이 한 문장으로 분명히 드러나는가",
    ],
  },
  {
    key: "structure",
    label: "구성",
    max: 15,
    criteria: [
      "서론-본론-결론이 구분되는가",
      "근거가 두 개 이상 있고 각각에 구체적인 예나 설명이 붙었는가",
      "접속 표현(まず・一方で・しかし・したがって 등)으로 문단이 이어지는가",
      "결론이 서론의 입장과 어긋나지 않는가",
    ],
  },
  {
    key: "language",
    label: "언어",
    max: 15,
    criteria: [
      "문체가 である체로 통일되었는가 (です・ます체 혼용은 감점)",
      "조사·활용·한자 표기에 오류가 없는가",
      "회화체(でも・だから・すごく・〜けど)를 쓰지 않았는가",
      "같은 표현을 반복하지 않고 아카데믹한 어휘를 썼는가",
      "한 문장이 지나치게 길어 뜻이 흐려지지 않았는가",
    ],
  },
];

export const RUBRIC_MAX = WRITING_RUBRIC.reduce((n, a) => n + a.max, 0); // 50

/** 분량 규정 — 미달·초과는 내용과 별개로 감점된다 */
export const MIN_CHARS = 400;
export const MAX_CHARS = 500;

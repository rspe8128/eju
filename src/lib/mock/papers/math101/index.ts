import type { MockPaper } from "../../types";
import { problemsSection } from "./problems";

export const math101: MockPaper = {
  id: "m1-mock-01",
  subjectCode: "math1",
  subjectLabel: "수학 코스1",
  title: "수학 코스1 모의고사 제1회",
  level: "표준",
  description:
    "코스1 전 영역을 다단계 추론 문항으로 구성한 표준 난도 20문항. 판별식과 근의 부호 조건, 조건부확률, 정수의 합동, 방멱정리처럼 공식 한 줄 대입으로는 끝나지 않고 조건을 정리해 두세 단계를 밟아야 하는 문항만 모았다. 오답 선택지는 부호 실수, 부등호 등호 오독, sin과 cos 혼동, 최대공약수와 최소공배수 뒤바꾸기 같은 실제 빈출 실수에서 역산해 만들었으므로 찍어서 맞히기 어렵다. 일본 현지 모의고사와 같은 깊이. 제한시간 80분.",
  sections: [problemsSection],
};

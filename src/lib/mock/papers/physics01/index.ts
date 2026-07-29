import type { MockPaper } from "../../types";
import { problemsSection } from "./problems";

export const physics01: MockPaper = {
  id: "ph-mock-01",
  subjectCode: "physics",
  subjectLabel: "물리",
  title: "물리 모의고사 제1회",
  level: "표준",
  description:
    "역학 6 · 열 2 · 파동 3 · 전자기 4 · 원자 2로 구성한 17문항. 공식 하나로 끝나는 문항은 없고, 보존량을 정한 뒤 두 단계 이상 계산해야 답이 나온다. 오답 선택지는 단위 환산·1/2 누락·직렬과 병렬 혼동 같은 실제 실수에서 역산했다. 60분.",
  sections: [problemsSection],
};

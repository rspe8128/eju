import type { MockPaper } from "../../types";
import { listeningChartPlaceholder, listeningPlaceholder } from "../listeningPlaceholder";
import { writingSection } from "./writing";
import { readingSection } from "./reading";

export const japanese02: MockPaper = {
  id: "jp-mock-02",
  subjectCode: "japanese",
  subjectLabel: "일본어",
  title: "일본어 모의고사 제2회",
  level: "실전",
  description:
    "제1회보다 논설문 비중을 높인 회차. 통념을 제시한 뒤 뒤집는 구조와, 조건이 여러 개 걸린 실용문이 많다. 독해 25문항 + 기술 2주제.",
  sections: [
    writingSection,
    readingSection,
    listeningChartPlaceholder(),
    listeningPlaceholder(),
  ],
};

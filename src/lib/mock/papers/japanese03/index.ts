import type { MockPaper } from "../../types";
import { listeningChartPlaceholder, listeningPlaceholder } from "../listeningPlaceholder";
import { writingSection } from "./writing";
import { readingSection } from "./reading";

export const japanese03: MockPaper = {
  id: "jp-mock-03",
  subjectCode: "japanese",
  subjectLabel: "일본어",
  title: "일본어 모의고사 제3회",
  level: "표준",
  description:
    "자연과학·사회과학 소재를 섞어 배경지식 의존도를 낮춘 회차. 본문이 명시적으로 부정한 내용을 되돌린 오답, 「ただし」 뒤를 놓치면 걸리는 오답을 집중 배치했다. 독해 25문항 + 기술 2주제.",
  sections: [
    writingSection,
    readingSection,
    listeningChartPlaceholder(),
    listeningPlaceholder(),
  ],
};

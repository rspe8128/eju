import type { MockPaper } from "../../types";
import { listeningChartPlaceholder, listeningPlaceholder } from "../listeningPlaceholder";
import { writingSection } from "./writing";
import { readingSection } from "./reading";

export const japanese01: MockPaper = {
  id: "jp-mock-01",
  subjectCode: "japanese",
  subjectLabel: "일본어",
  title: "일본어 모의고사 제1회",
  level: "표준",
  description:
    "EJU 일본어 출제 형식을 그대로 따른 자체 제작 모의고사. 독해 25문항(설명문·논설문·실용문·도표)과 기술 2주제. 문항마다 한국어 해설과 지문 번역이 붙는다.",
  sections: [
    writingSection,
    readingSection,
    listeningChartPlaceholder(),
    listeningPlaceholder(),
  ],
};

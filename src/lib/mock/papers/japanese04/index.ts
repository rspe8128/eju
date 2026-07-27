import type { MockPaper } from "../../types";
import { listeningChartPlaceholder, listeningPlaceholder } from "../listeningPlaceholder";
import { writingSection } from "./writing";
import { readingSection } from "./reading";

export const japanese04: MockPaper = {
  id: "jp-mock-04",
  subjectCode: "japanese",
  subjectLabel: "일본어",
  title: "일본어 모의고사 제4회",
  level: "실전",
  description:
    "네 회차 중 가장 어렵다. 오답 선택지 상당수가 본문에 실제로 나오는 문장이되 필자가 부정·상대화한 쪽이라, 근거 문장의 위치까지 정확히 잡아야 풀린다. 독해 25문항 + 기술 2주제.",
  sections: [
    writingSection,
    readingSection,
    listeningChartPlaceholder(),
    listeningPlaceholder(),
  ],
};

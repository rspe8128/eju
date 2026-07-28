import type { MockPaper } from "../../types";
import { writingSection } from "./writing";
import { readingSection } from "./reading";
import { listeningChartSection } from "./listeningChart";
import { listeningSection } from "./listening";

export const japanese01: MockPaper = {
  id: "jp-mock-01",
  subjectCode: "japanese",
  subjectLabel: "일본어",
  title: "일본어 모의고사 제1회",
  level: "표준",
  description:
    "EJU 일본어 4개 영역이 모두 들어 있는 완본. 기술 2주제 · 독해 25문항 · 청독해 12문항 · 청해 15문항. 음성은 브라우저 TTS로 재생되며 실전처럼 1회만 들을 수 있다(끄면 여러 번 가능).",
  sections: [writingSection, readingSection, listeningChartSection, listeningSection],
};

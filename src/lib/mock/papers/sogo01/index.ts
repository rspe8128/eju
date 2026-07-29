import type { MockPaper } from "../../types";
import { readingSection } from "./reading";

export const sogo01: MockPaper = {
  id: "sg-mock-01",
  subjectCode: "sogo",
  subjectLabel: "종합과목",
  title: "종합과목 모의고사 제1회",
  level: "표준",
  description:
    "정치·경제·국제경제(도표)·사회·지리(도표)·근현대사를 고르게 담은 20문항 / 60분. 배경지식이 아니라 지문과 표에서 근거를 찾아 고르는 연습용. 오답 선택지 상당수가 본문에 실제로 나오는 문장이지만, 다른 단락의 이야기이거나 필자가 부정한 쪽이다.",
  sections: [readingSection],
};

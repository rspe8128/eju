import type { MockPaper, MockSection } from "./types";
import { japanese01 } from "./papers/japanese01";
import { japanese02 } from "./papers/japanese02";
import { japanese03 } from "./papers/japanese03";
import { japanese04 } from "./papers/japanese04";
import { math101 } from "./papers/math101";
import { sogo01 } from "./papers/sogo01";
import { physics01 } from "./papers/physics01";

/**
 * 모의고사 카탈로그.
 *
 * 새 회차·새 과목을 추가하는 방법:
 *   1) src/lib/mock/papers/<이름>/ 아래에 MockPaper 객체를 만든다
 *   2) 아래 배열에 넣는다
 * 화면·채점·번역·약점분석은 전부 이 배열만 보고 동작하므로 UI는 손대지 않아도 된다.
 */
export const MOCK_PAPERS: MockPaper[] = [
  japanese01,
  japanese02,
  japanese03,
  japanese04,
  math101,
  sogo01,
  physics01,
];

export function getMockPaper(id: string): MockPaper | undefined {
  return MOCK_PAPERS.find((p) => p.id === id);
}

export function getMockSection(
  paperId: string,
  sectionId: string
): { paper: MockPaper; section: MockSection } | undefined {
  const paper = getMockPaper(paperId);
  if (!paper) return undefined;
  const section = paper.sections.find((s) => s.id === sectionId);
  if (!section) return undefined;
  return { paper, section };
}

/** 문항이 하나도 없는 섹션은 아직 준비 중이다. */
export function isSectionReady(section: MockSection): boolean {
  if (section.kind === "writing") return (section.writingPrompts?.length ?? 0) > 0;
  return section.questions.length > 0;
}

/** 과목 코드별로 묶어서 보여주기 위한 그룹 */
export function papersBySubject(): { subjectCode: string; label: string; papers: MockPaper[] }[] {
  const map = new Map<string, { subjectCode: string; label: string; papers: MockPaper[] }>();
  for (const p of MOCK_PAPERS) {
    const cur = map.get(p.subjectCode) ?? {
      subjectCode: p.subjectCode,
      label: p.subjectLabel,
      papers: [],
    };
    cur.papers.push(p);
    map.set(p.subjectCode, cur);
  }
  return [...map.values()];
}

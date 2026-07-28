import type { ConceptItem, Item, ProblemItem, Unit } from "../../types";
import raw from "./modules.json";

/**
 * 교과목 학습 모듈 카탈로그.
 *
 * 단어장 보관함(`src/lib/data/vocab/library.ts`)과 같은 구조다.
 * 모듈 = 한 단원 분량의 개념 노트 + 연습문제. 담아야 학습 목록에 들어간다.
 *
 * ── 왜 자동으로 넣지 않는가 ────────────────────────────────────
 * 단어장과 같은 이유다. 교과목 전체를 한꺼번에 넣으면 무엇부터 볼지 알 수 없고,
 * 문항·개념이 전부 localStorage에 복사된다. 필요한 단원만 담는 편이 낫다.
 *
 * ── 데이터가 .json 인 이유 ─────────────────────────────────────
 * markdown이 긴 객체 리터럴을 TS로 두면 tsc가 느려진다(단어 데이터에서 겪었다).
 * JSON으로 두면 타입 추론이 한 번에 끝난다.
 *
 * 내용은 전부 자체 집필이다. JASSO 기출은 저작권이 있어 옮길 수 없다.
 */

export type StudyModuleRaw = {
  id: string;
  subjectId: string;
  order: number;
  title: string;
  /** 이 모듈로 무엇을 할 수 있게 되는지 — 목록에서 고르는 근거가 된다 */
  goal: string;
  concepts: { title: string; markdown: string }[];
  problems: { title: string; question: string; answer: string; explanation: string }[];
};

const MODULES_RAW = raw as StudyModuleRaw[];

export type StudyModule = {
  id: string;
  subjectId: string;
  title: string;
  goal: string;
  order: number;
  conceptCount: number;
  problemCount: number;
  /** AppData에 넣을 Unit + Item 묶음을 만든다 */
  build: () => { unit: Unit; items: Item[] };
};

/**
 * 모듈 id로부터 Unit·Item id를 만든다.
 *
 * **결정적(deterministic)이어야 한다.** 랜덤 id를 쓰면 같은 모듈을 뺐다가 다시 담았을 때
 * 예전 풀이 기록(solved)과 이어지지 않고, 중복 추가도 막을 수 없다.
 */
export function unitIdOf(moduleId: string): string {
  return `unit-${moduleId}`;
}

function conceptIdOf(moduleId: string, i: number): string {
  return `item-${moduleId}-c${i + 1}`;
}

function problemIdOf(moduleId: string, i: number): string {
  return `item-${moduleId}-p${i + 1}`;
}

function buildModule(m: StudyModuleRaw): { unit: Unit; items: Item[] } {
  const unit: Unit = {
    id: unitIdOf(m.id),
    subjectId: m.subjectId,
    title: m.title,
    order: m.order,
  };

  const concepts: ConceptItem[] = m.concepts.map((c, i) => ({
    id: conceptIdOf(m.id, i),
    unitId: unit.id,
    type: "concept",
    title: c.title,
    markdown: c.markdown,
  }));

  const problems: ProblemItem[] = m.problems.map((p, i) => ({
    id: problemIdOf(m.id, i),
    unitId: unit.id,
    type: "problem",
    title: p.title,
    question: p.question,
    answer: p.answer,
    explanation: p.explanation,
    solved: false,
  }));

  // 개념을 먼저 읽고 문제를 푸는 순서가 되도록 개념 → 문제로 넣는다
  return { unit, items: [...concepts, ...problems] };
}

export const STUDY_MODULES: StudyModule[] = MODULES_RAW.map((m) => ({
  id: m.id,
  subjectId: m.subjectId,
  title: m.title,
  goal: m.goal,
  order: m.order,
  conceptCount: m.concepts.length,
  problemCount: m.problems.length,
  build: () => buildModule(m),
})).sort((a, b) => a.order - b.order);

export function getStudyModule(id: string): StudyModule | undefined {
  return STUDY_MODULES.find((m) => m.id === id);
}

/** 과목별로 묶은 목록. 화면에서 그대로 그리면 된다. */
export function modulesBySubject(): { subjectId: string; modules: StudyModule[] }[] {
  const order = [
    "subject-math",
    "subject-sogo",
    "subject-physics",
    "subject-chemistry",
    "subject-biology",
  ];
  const map = new Map<string, StudyModule[]>();
  for (const m of STUDY_MODULES) {
    const list = map.get(m.subjectId) ?? [];
    list.push(m);
    map.set(m.subjectId, list);
  }
  return [...map.entries()]
    .map(([subjectId, modules]) => ({
      subjectId,
      modules: modules.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => {
      const ai = order.indexOf(a.subjectId);
      const bi = order.indexOf(b.subjectId);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

export const MODULE_TOTALS = {
  modules: STUDY_MODULES.length,
  concepts: STUDY_MODULES.reduce((n, m) => n + m.conceptCount, 0),
  problems: STUDY_MODULES.reduce((n, m) => n + m.problemCount, 0),
};

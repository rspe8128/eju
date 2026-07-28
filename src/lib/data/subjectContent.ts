import type { ConceptItem, Item, ProblemItem, Subject, Unit } from "../types";

/**
 * 교과목 과목 목록.
 *
 * ── UNITS·ITEMS 가 비어 있는 이유 ─────────────────────────────
 * 예전에는 여기에 15단원(개념 15 + 문제 17)이 직접 들어 있었고, 앱을 처음 켜면
 * 통째로 들어갔다. 지금은 그 내용이 전부 **학습 모듈**로 옮겨졌다.
 * → src/lib/data/subjects/modules.json (19모듈 · 개념 38 · 문제 57)
 *
 * 옮기면서 내용도 넓혔다. 예전 단원은 개념 하나에 문제 한두 개였는데,
 * 모듈은 개념 2개 + 문제 3개에 일본어 용어표까지 붙는다.
 * 예전 단원 15개 중 14개는 새 모듈이 그대로 덮고, 유일하게 빠져 있던
 * 산업혁명은 「역사 · 시민혁명과 산업혁명」 모듈로 넓혀서 살렸다.
 *
 * 두 배열을 비워 두는 것은 **같은 내용이 두 벌 생기는 것을 막기 위해서**다.
 * migrate.ts가 옛 버전 데이터를 올릴 때 이 배열을 참조하는데, 비어 있으면
 * 아무것도 추가하지 않는다. 과목 목록(SUBJECTS)은 화면을 그리는 데 필요하므로 남긴다.
 */

export const SUBJECT_IDS = {
  math: "subject-math",
  sogo: "subject-sogo",
  physics: "subject-physics",
  chemistry: "subject-chemistry",
  biology: "subject-biology",
} as const;

export const SUBJECTS: Subject[] = [
  { id: SUBJECT_IDS.math, name: "수학 코스1", icon: "calculator", color: "#8b5cf6" },
  { id: SUBJECT_IDS.sogo, name: "종합과목", icon: "globe", color: "#f59e0b" },
  { id: SUBJECT_IDS.physics, name: "물리", icon: "atom", color: "#06b6d4" },
  { id: SUBJECT_IDS.chemistry, name: "화학", icon: "flask", color: "#10b981" },
  { id: SUBJECT_IDS.biology, name: "생물", icon: "leaf", color: "#84cc16" },
];

export const UNITS: Unit[] = [];

export const ITEMS: Item[] = [];

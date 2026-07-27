import type { ExamProfile, ScienceChoice } from "./types";

export const EJU_SUBJECTS = {
  japanese: { label: "일본어", maxScore: 400, writingMax: 50, minutes: 125 },
  math1: { label: "수학 코스1", maxScore: 200, minutes: 80 },
  math2: { label: "수학 코스2", maxScore: 200, minutes: 80 },
  sogo: { label: "종합과목", maxScore: 200, minutes: 80 },
  physics: { label: "물리", maxScore: 100, minutes: 80 },
  chemistry: { label: "화학", maxScore: 100, minutes: 80 },
  biology: { label: "생물", maxScore: 100, minutes: 80 },
} as const;

export type EjuSubjectCode = keyof typeof EJU_SUBJECTS;

export const SCIENCE_SUBJECTS: ScienceChoice[] = ["physics", "chemistry", "biology"];

/** 이과(물리·화학·생물)와 종합과목은 동시 선택 불가 */
export function isValidExamProfile(profile: ExamProfile): boolean {
  if (profile.track === "humanities") {
    return profile.scienceChoices.length === 0;
  }
  return (
    profile.scienceChoices.length === 2 &&
    profile.scienceChoices.every((c) => SCIENCE_SUBJECTS.includes(c))
  );
}

export function getActiveSubjectCodes(profile: ExamProfile): string[] {
  const codes: string[] = ["japanese"];
  codes.push(profile.mathCourse === "course1" ? "math1" : "math2");
  if (profile.track === "humanities") {
    codes.push("sogo");
  } else {
    codes.push(...profile.scienceChoices);
  }
  return codes;
}

const EXTRA_LABELS: Record<string, string> = {
  japaneseWriting: "일본어 기술",
  toefl: "토플",
  math: "수학",
  subjects: "교과목",
};

export function getSubjectLabel(code: string): string {
  if (EXTRA_LABELS[code]) return EXTRA_LABELS[code];
  const subject = EJU_SUBJECTS[code as EjuSubjectCode];
  return subject?.label ?? code;
}

export function getMaxScore(code: string): number {
  if (code === "japaneseWriting") return 50;
  const subject = EJU_SUBJECTS[code as EjuSubjectCode];
  return subject?.maxScore ?? 100;
}

export function sumScores(scores: Record<string, number>, codes: string[]): number {
  return codes.reduce((sum, code) => sum + (scores[code] ?? 0), 0);
}

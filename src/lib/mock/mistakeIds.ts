import { getMockSection } from "./registry";
import type { MockPaper, MockQuestion, MockSection } from "./types";

/** mistakes.sourceId = paperId:sectionId:questionId */
export function mockMistakeId(paperId: string, sectionId: string, questionId: string): string {
  return `${paperId}:${sectionId}:${questionId}`;
}

export function parseMockMistakeId(
  sourceId: string
): { paperId: string; sectionId: string; questionId: string } | null {
  const parts = sourceId.split(":");
  if (parts.length < 3) return null;
  const questionId = parts[parts.length - 1]!;
  const sectionId = parts[parts.length - 2]!;
  const paperId = parts.slice(0, -2).join(":");
  if (!paperId || !sectionId || !questionId) return null;
  return { paperId, sectionId, questionId };
}

export function resolveMockMistake(sourceId: string): {
  paper: MockPaper;
  section: MockSection;
  question: MockQuestion;
} | null {
  const parsed = parseMockMistakeId(sourceId);
  if (!parsed) return null;
  const hit = getMockSection(parsed.paperId, parsed.sectionId);
  if (!hit) return null;
  const question = hit.section.questions.find((q) => q.id === parsed.questionId);
  if (!question) return null;
  return { paper: hit.paper, section: hit.section, question };
}

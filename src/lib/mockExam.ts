/**
 * EJU 실전 시간표 기반 모의고사 세션 정의.
 * 일본어는 기술 → 독해 → 청독해·청해 순서로 총 125분.
 */

export type MockPhase = {
  id: string;
  label: string;
  minutes: number;
  hint: string;
};

export type MockSubjectPlan = {
  code: string;
  label: string;
  totalMinutes: number;
  phases: MockPhase[];
};

export const MOCK_PLANS: MockSubjectPlan[] = [
  {
    code: "japanese",
    label: "일본어",
    totalMinutes: 125,
    phases: [
      {
        id: "writing",
        label: "기술(記述)",
        minutes: 30,
        hint: "2개 주제 중 1개 선택 · 400~500자 · である체",
      },
      {
        id: "reading",
        label: "독해(読解)",
        minutes: 40,
        hint: "설명문·논설문·실용문 · 문제 먼저 읽고 근거 찾기",
      },
      {
        id: "listening",
        label: "청독해·청해",
        minutes: 55,
        hint: "음성은 한 번만 재생 · 메모하며 듣기",
      },
    ],
  },
  {
    code: "sogo",
    label: "종합과목",
    totalMinutes: 80,
    phases: [{ id: "main", label: "종합과목", minutes: 80, hint: "약 38~40문항 · 자료 해석 문제 주의" }],
  },
  {
    code: "math1",
    label: "수학 코스1",
    totalMinutes: 80,
    phases: [{ id: "main", label: "수학 코스1", minutes: 80, hint: "마크시트 · 계산 속도가 관건" }],
  },
  {
    code: "math2",
    label: "수학 코스2",
    totalMinutes: 80,
    phases: [{ id: "main", label: "수학 코스2", minutes: 80, hint: "미적분·벡터·복소수평면 포함" }],
  },
  {
    code: "science",
    label: "이과 (2과목)",
    totalMinutes: 80,
    phases: [
      { id: "sci1", label: "선택 1과목", minutes: 40, hint: "시간 배분 목표: 40분" },
      { id: "sci2", label: "선택 2과목", minutes: 40, hint: "남은 시간 40분" },
    ],
  },
];

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function getMockPlan(code: string): MockSubjectPlan | undefined {
  return MOCK_PLANS.find((p) => p.code === code);
}

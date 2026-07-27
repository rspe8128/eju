/**
 * JLPT(일본어능력시험) 한국 실시 일정.
 * 출처: JLPT 서울실시위원회 https://www.jlpt.or.kr
 *
 * confirmed: true  → jlpt.or.kr에 공식 게시된 확정 일정
 * confirmed: false → 예년 패턴(7월 첫째 일요일 / 12월 첫째 일요일, 접수는 시험 3개월 전 시작)
 *                    기반 추정. 공식 발표 후 반드시 갱신할 것.
 */

export type JlptWindow = {
  start: string;
  end: string;
};

export type JlptSession = {
  id: string;
  year: number;
  round: 1 | 2;
  label: string;
  /** 시험일 */
  examDate: string;
  /** 일반 접수 (온라인) */
  regular: JlptWindow;
  /** 추가 접수 — 수수료 10% 가산, 온라인만 가능 */
  late?: JlptWindow;
  /** 수험표 출력 시작일 */
  voucherFrom?: string;
  /** 성적 발표 */
  resultDate?: string;
  confirmed: boolean;
  note?: string;
};

export const JLPT_URL = "https://www.jlpt.or.kr";
export const JLPT_INFO_URL = "https://www.jlpt.or.kr/html/information_01.html";

export const JLPT_SESSIONS: JlptSession[] = [
  {
    id: "2026-1",
    year: 2026,
    round: 1,
    label: "2026년 제1회 JLPT",
    examDate: "2026-07-05",
    regular: { start: "2026-04-01", end: "2026-04-19" },
    late: { start: "2026-04-27", end: "2026-05-03" },
    voucherFrom: "2026-05-25",
    resultDate: "2026-08-31",
    confirmed: true,
    note: "종료된 회차. 성적 발표 8월 말, 성적증명서 우편 발송 10월 중순.",
  },
  {
    id: "2026-2",
    year: 2026,
    round: 2,
    label: "2026년 제2회 JLPT",
    examDate: "2026-12-06",
    regular: { start: "2026-09-01", end: "2026-09-20" },
    late: { start: "2026-09-28", end: "2026-10-04" },
    voucherFrom: "2026-11-23",
    resultDate: "2027-01-31",
    confirmed: false,
    note: "접수 시작일이 가장 중요. 인기 시험장은 선착순으로 접수 첫날 오전에 마감된다.",
  },
  {
    id: "2027-1",
    year: 2027,
    round: 1,
    label: "2027년 제1회 JLPT",
    examDate: "2027-07-04",
    regular: { start: "2027-04-01", end: "2027-04-19" },
    late: { start: "2027-04-26", end: "2027-05-02" },
    confirmed: false,
    note: "추정 일정. 고2 상반기 — N2 목표 회차로 잡기 좋다.",
  },
  {
    id: "2027-2",
    year: 2027,
    round: 2,
    label: "2027년 제2회 JLPT",
    examDate: "2027-12-05",
    regular: { start: "2027-09-01", end: "2027-09-20" },
    late: { start: "2027-09-27", end: "2027-10-03" },
    confirmed: false,
    note: "추정 일정. 고2 하반기 — N1 도전 회차.",
  },
];

export const JLPT_EXAM_TIMES = [
  { levels: "N1 · N2", enter: "09:40까지 입실 완료" },
  { levels: "N3 · N4 · N5", enter: "13:40까지 입실 완료" },
];

export const JLPT_REGIONS = [
  { area: "서울권", cities: "서울, 인천, 수원, 성남, 안양, 고양, 부천, 천안, 청주, 대전, 전주, 광주, 춘천, 원주" },
  { area: "부산권", cities: "부산, 김해, 대구, 구미, 창원, 진주, 울산, 포항 (bsjlpt.or.kr 별도 접수)" },
  { area: "제주권", cities: "제주" },
];

/** 중·고등학생 규정 신분증 — 시험 당일 없으면 응시 불가 */
export const JLPT_ID_NOTE =
  "중·고등학생은 여권 / 학생증 / 청소년증 / 주민등록증 중 하나 필요. 사진 없는 학생증은 인정되지 않는다.";

function toDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

/** 로컬 기준 YYYY-MM-DD. toISOString()은 UTC라 한국 새벽에 하루 밀린다. */
function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

export type JlptStatus =
  | { kind: "before-open"; daysToOpen: number }
  | { kind: "open"; daysToClose: number }
  | { kind: "late-open"; daysToClose: number }
  | { kind: "closed" }
  | { kind: "done" };

/** 오늘 기준 해당 회차의 접수 상태 */
export function jlptStatus(session: JlptSession, today = new Date()): JlptStatus {
  const t = toDate(localDateString(today));
  const exam = toDate(session.examDate);
  if (t > exam) return { kind: "done" };

  const regStart = toDate(session.regular.start);
  const regEnd = toDate(session.regular.end);
  if (t < regStart) return { kind: "before-open", daysToOpen: daysBetween(t, regStart) };
  if (t <= regEnd) return { kind: "open", daysToClose: daysBetween(t, regEnd) };

  if (session.late) {
    const lateStart = toDate(session.late.start);
    const lateEnd = toDate(session.late.end);
    if (t >= lateStart && t <= lateEnd) {
      return { kind: "late-open", daysToClose: daysBetween(t, lateEnd) };
    }
  }
  return { kind: "closed" };
}

/** 아직 안 끝난 회차만 */
export function upcomingJlpt(today = new Date()): JlptSession[] {
  const t = localDateString(today);
  return JLPT_SESSIONS.filter((s) => s.examDate >= t);
}

/** 일정 페이지 D-day 목록에 꽂아 넣을 형태로 변환 */
export function jlptDeadlineEntries(today = new Date()) {
  return upcomingJlpt(today).flatMap((s) => [
    { id: `${s.id}-open`, label: `${s.label} 접수 시작`, date: s.regular.start, kind: "apply" as const },
    { id: `${s.id}-close`, label: `${s.label} 접수 마감`, date: s.regular.end, kind: "deadline" as const },
    { id: `${s.id}-exam`, label: s.label, date: s.examDate, kind: "exam" as const },
  ]);
}

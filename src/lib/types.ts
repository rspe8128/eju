export type DeckType = "vocab" | "grammar" | "kanji";

export type Deck = {
  id: string;
  subject: "japanese" | "toefl" | string;
  title: string;
  type: DeckType;
};

export type CardSRS = {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  /** 누적 오답 횟수 (약점 분석용) */
  lapses?: number;
  /** 누적 학습 횟수 */
  reviews?: number;
};

export type Card = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  /** 일본어 카드의 읽는 법(후리가나), 영어 카드의 품사 표기 등 */
  reading?: string;
  exampleSentence?: string;
  tags: string[];
  notes?: string;
  /** 문법 빈칸 채우기용 보기 */
  options?: string[];
  /** 한자 음독 */
  onyomi?: string;
  /** 한자 훈독 */
  kunyomi?: string;
  srs: CardSRS;
};

export type Subject = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type Unit = {
  id: string;
  subjectId: string;
  title: string;
  order: number;
};

export type ConceptItem = {
  id: string;
  unitId: string;
  type: "concept";
  title: string;
  markdown: string;
};

export type ProblemItem = {
  id: string;
  unitId: string;
  type: "problem";
  title: string;
  question: string;
  answer: string;
  explanation?: string;
  solved: boolean;
};

export type Item = ConceptItem | ProblemItem;

export type MistakeSourceType = "card" | "problem" | "mock";

export type MistakeEntry = {
  id: string;
  sourceType: MistakeSourceType;
  /**
   * card/problem: 해당 id.
   * mock: `${paperId}:${sectionId}:${questionId}` (문항 본문은 복사하지 않음)
   */
  sourceId: string;
  addedAt: string;
  resolved: boolean;
};

export type Goal = {
  id: string;
  subjectId: string;
  weekStart: string;
  targetCount: number;
  currentCount: number;
};

export type Deadline = {
  id: string;
  label: string;
  date: string;
};

export type StudyLog = {
  date: string;
  subjectId: string;
  count: number;
  correct: number;
  wrong: number;
};

export type ScienceChoice = "physics" | "chemistry" | "biology";

export type ExamProfile = {
  track: "humanities" | "science";
  mathCourse: "course1" | "course2";
  scienceChoices: ScienceChoice[];
  targetScores: Record<string, number>;
  examDate: string;
};

export type ExamRecord = {
  id: string;
  date: string;
  kind: "mock" | "real";
  scores: Record<string, number>;
  memo?: string;
  /** 손으로 넣은 기록 vs 모의고사 채점 자동 환산 */
  source?: "manual" | "mock-auto";
  /** mock-auto 일 때 회차 키 (예: jp-mock-01) — 같은 회차 최신만 추이에 쓰기 위함 */
  mockPaperId?: string;
};

/**
 * 기출 회차 × 과목의 정답표.
 * JASSO 정답 PDF가 스캔 이미지라 기계 추출이 불가능하므로 한 번만 직접 등록하면
 * 이후 같은 회차를 풀 때마다 자동 채점된다. id = `${paperId}:${subjectCode}`
 */
export type AnswerKey = {
  id: string;
  paperId: string;
  subjectCode: string;
  /** index 0 = 1번 문항. "" = 미입력 */
  answers: string[];
  /** 문항별 단원 태그. 미지정은 "untagged" */
  topics: string[];
  updatedAt: string;
};

export type AttemptResult = {
  q: number;
  picked: string;
  answer: string;
  correct: boolean;
  topicId: string;
};

/** 기출 1회분 응시 기록 */
export type ExamAttempt = {
  id: string;
  paperId: string;
  subjectCode: string;
  date: string;
  responses: string[];
  correctCount: number;
  totalCount: number;
  /** 실제 소요 시간(분) */
  minutes: number;
  results: AttemptResult[];
  memo?: string;
};

export type PlanTarget = {
  id: string;
  kind: "deck" | "subject";
  refId: string;
  totalUnits: number;
  completedUnits: number;
  dueDate: string;
  /** 하루에 볼 개수 */
  dailyQuota: number;
  /**
   * 하루 개수를 정하는 방식.
   *  · "auto"   기한에 맞춰 자동 계산 (남은 개수 ÷ 남은 평일)
   *  · "manual" 사용자가 정한 dailyQuota를 그대로 쓴다
   *
   * 예전에는 auto밖에 없었다. 그런데 시험일이 2년 넘게 남아 있으면 분모가 700일쯤
   * 되어서, 574장짜리 덱도 ceil(574/700) = 하루 1개로 나왔다. 그 속도면 끝나지
   * 않으므로 직접 정할 수 있어야 한다. 없으면 "auto"로 본다(기존 데이터 호환).
   */
  quotaMode?: "auto" | "manual";
};

export type FocusSession = {
  id: string;
  startedAt: string;
  minutes: number;
  subjectId?: string;
};

export type WritingEntry = {
  id: string;
  date: string;
  prompt: string;
  body: string;
  /** 원고지 기준(공백 제외) 글자 수 */
  charCount: number;
  minutes: number;
  selfScore?: number;
  memo?: string;
  /**
   * AI 채점 결과. 전부 선택 항목이므로 예전에 쓴 글에는 없다 —
   * 그래서 스키마 버전을 올리지 않아도 된다.
   */
  aiScore?: number;
  aiMax?: number;
  aiAxes?: { label: string; score: number; max: number; comment: string }[];
  aiStrengths?: string[];
  aiImprovements?: string[];
  aiFixes?: { original: string; corrected: string; reason: string }[];
  aiAdvice?: string;
  aiModel?: string;
};

export type DictationEntry = {
  id: string;
  title: string;
  answer: string;
  createdAt: string;
};

export type AppSettings = {
  pomodoroWork: number;
  pomodoroBreak: number;
  showReading: boolean;
  excludeWeekends: boolean;
  planBufferDays: number;
  /** ISO 날짜(YYYY-MM-DD). 없으면 아직 한 번도 백업 안 한 것 */
  lastBackupAt?: string | null;
};

export type AppData = {
  schemaVersion: number;
  decks: Deck[];
  cards: Card[];
  subjects: Subject[];
  units: Unit[];
  items: Item[];
  mistakes: MistakeEntry[];
  goals: Goal[];
  deadlines: Deadline[];
  studyLogs: StudyLog[];
  streak: number;
  lastStudyDate: string | null;
  examProfile?: ExamProfile;
  examRecords: ExamRecord[];
  answerKeys: AnswerKey[];
  examAttempts: ExamAttempt[];
  planTargets: PlanTarget[];
  focusSessions: FocusSession[];
  writingEntries: WritingEntry[];
  dictationEntries: DictationEntry[];
  settings: AppSettings;
};

export type SRSRating = 1 | 2 | 3; // 1=모름, 2=헷갈림, 3=기억함

export const CURRENT_SCHEMA_VERSION = 11;

export const DEFAULT_SETTINGS: AppSettings = {
  pomodoroWork: 25,
  pomodoroBreak: 5,
  showReading: true,
  excludeWeekends: true,
  planBufferDays: 7,
};

export const DEFAULT_EXAM_PROFILE: ExamProfile = {
  track: "humanities",
  mathCourse: "course1",
  scienceChoices: [],
  targetScores: {
    japanese: 300,
    japaneseWriting: 35,
    math1: 150,
    sogo: 150,
  },
  // 고1(2026학년도) 기준 고3 2학기 EJU 2차(추정) — 실제 공식 일정은 매년 갱신되므로 확정 후 설정에서 수정할 것
  examDate: "2028-11-12",
};

export const SUBJECT_COLORS: Record<string, string> = {
  japanese: "#ef4444",
  toefl: "#3b82f6",
  math: "#8b5cf6",
  math1: "#8b5cf6",
  math2: "#7c3aed",
  sogo: "#f59e0b",
  physics: "#06b6d4",
  chemistry: "#10b981",
  biology: "#84cc16",
};

export function getSubjectColor(subjectId: string, subjects: Subject[]): string {
  if (SUBJECT_COLORS[subjectId]) return SUBJECT_COLORS[subjectId];
  const subject = subjects.find((s) => s.id === subjectId);
  return subject?.color ?? "#6366f1";
}

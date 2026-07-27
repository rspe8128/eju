/**
 * JASSO 공개 EJU 기출 카탈로그.
 *
 * ⚠️ 중요 — 왜 문제 원문을 이 저장소에 담지 않는가
 *
 * 1) 저작권: JASSO 기출은 JASSO의 저작물이며 공식 고지상 웹 업로드·공중송신·번안이
 *    금지되어 있다. 다만 "개인적 이용 목적의 열람·인쇄"는 허용된다.
 *    그래서 이 앱은 원문을 복제하지 않고, JASSO 원본 PDF를 그대로 띄워서 읽게 한다.
 *
 * 2) 애초에 원문이 없다: 일본어(日本語) 과목 공개본은 독해 지문이 통째로 삭제돼 있다.
 *    PDF에 남은 문구 → 「試験問題としては成立していますが、著作権上の都合により
 *    本問題のウェブ掲載はいたしません。」 (지문 원저자가 웹 게재를 허락하지 않음)
 *    수학·이과 PDF는 텍스트 레이어가 없는 스캔본이라 기계 추출 자체가 불가능하다.
 *
 * 따라서 "문제를 푸는" 경험은 [공식 PDF 뷰어 + 타이머 + 마크시트 답안지 + 자동 채점]
 * 조합으로 구현한다. 기능적으로는 동일하고, 도표·그래프가 원본 그대로 보이므로
 * 수학·이과는 오히려 텍스트 이식보다 정확하다.
 */

export type PaperSubjectKey = "jafl" | "math" | "jw" | "science";

export type PaperLinks = {
  /** 일본어 원문 PDF */
  ja?: string;
  /** 영어판 PDF (일본어 과목은 없음) */
  en?: string;
};

export type PastPaper = {
  /** "2018-1" */
  id: string;
  year: number;
  session: 1 | 2;
  label: string;
  /** JASSO 회차 페이지(일본어). 직접 PDF 링크가 없을 때 여기로 보낸다. */
  sessionUrl: string;
  /** 과목별 직접 PDF 링크. 확인된 것만 채워져 있다. */
  pdfs: Partial<Record<PaperSubjectKey, PaperLinks>>;
  /** 정답표 PDF */
  answerPdf?: string;
  /** 기술(記述) 모범답안 PDF */
  writingModelPdf?: string;
  /** 미공개 과목 (JASSO "준비 중") */
  unavailable: PaperSubjectKey[];
  /** 회차별 특이사항 */
  note?: string;
};

const JA_PAGE = "https://www.jasso.go.jp/ryugaku/eju/examinee/pastpaper_sample";
const FILE = "https://www.jasso.go.jp/en/ryugaku/eju/examinee/pastpaper_sample/__icsFiles/afieldfile";

function sessionUrl(year: number, session: 1 | 2): string {
  return `${JA_PAGE}/pastpaper_${year}_${session}.html`;
}

function base(year: number, session: 1 | 2, unavailable: PaperSubjectKey[] = []): PastPaper {
  return {
    id: `${year}-${session}`,
    year,
    session,
    label: `${year}년 제${session}회`,
    sessionUrl: sessionUrl(year, session),
    pdfs: {},
    unavailable,
  };
}

/**
 * 2018년 2차 ~ 2021년 1차는 JASSO가 일본어·종합과목을 아직 공개하지 않았다.
 * 2019년 2차와 2020년 1차는 (코로나 등 사유로) 아예 공개되지 않는다.
 */
const NOT_YET: PaperSubjectKey[] = ["jafl", "jw"];

export const PAST_PAPERS: PastPaper[] = [
  { ...base(2021, 1, NOT_YET), note: "일본어·종합과목 미공개 (JASSO 준비 중)" },
  { ...base(2020, 2, NOT_YET), note: "일본어·종합과목 미공개 (JASSO 준비 중)" },
  { ...base(2019, 1, NOT_YET), note: "일본어·종합과목 미공개 (JASSO 준비 중)" },
  { ...base(2018, 2, NOT_YET), note: "일본어·종합과목 미공개 (JASSO 준비 중)" },
  {
    ...base(2018, 1),
    // 직접 링크 확인 완료 (2026-07 기준)
    pdfs: {
      jafl: { ja: `${FILE}/2026/02/24/2018_1question_jafl_e.pdf` },
      science: {
        ja: `${FILE}/2021/09/10/2018_1question_science_1.pdf`,
        en: `${FILE}/2021/09/10/2018_1question_science_e_1.pdf`,
      },
      jw: {
        ja: `${FILE}/2026/01/15/2018_1question_jw.pdf`,
        en: `${FILE}/2026/01/15/2018_1question_jw_e.pdf`,
      },
      math: {
        ja: `${FILE}/2021/09/10/2018_1question_math_1.pdf`,
        en: `${FILE}/2021/09/10/2018_1question_math_e_1.pdf`,
      },
    },
    answerPdf: `${FILE}/2026/01/15/2018_1answer_e202512_1.pdf`,
    writingModelPdf: `${FILE}/2026/01/15/2018_1answer_jafl_writing_e.pdf`,
  },
  base(2017, 2),
  base(2017, 1),
  base(2016, 2),
  base(2016, 1),
  base(2015, 2),
  base(2015, 1),
  base(2014, 2),
  base(2014, 1),
  base(2013, 2),
  base(2013, 1),
  base(2012, 2),
  base(2012, 1),
  base(2011, 2),
  base(2011, 1),
  base(2010, 1),
];

/** 최근 5개년(공개 기준) — 기본으로 보여줄 회차 */
export const RECENT_PAPERS = PAST_PAPERS.slice(0, 10);

export function getPaper(id: string): PastPaper | undefined {
  return PAST_PAPERS.find((p) => p.id === id);
}

export function isAvailable(paper: PastPaper, subject: PaperSubjectKey): boolean {
  return !paper.unavailable.includes(subject);
}

/** 과목 키 → 마크시트를 만들 실제 EJU 과목 코드 */
export const PAPER_SUBJECT_META: Record<
  PaperSubjectKey,
  { label: string; codes: string[]; defaultQuestions: number; minutes: number }
> = {
  jafl: { label: "일본어", codes: ["japanese"], defaultQuestions: 52, minutes: 125 },
  math: { label: "수학", codes: ["math1", "math2"], defaultQuestions: 40, minutes: 80 },
  jw: { label: "종합과목", codes: ["sogo"], defaultQuestions: 38, minutes: 80 },
  science: {
    label: "이과",
    codes: ["physics", "chemistry", "biology"],
    defaultQuestions: 40,
    minutes: 80,
  },
};

/** EJU 과목 코드 → 기출 PDF 과목 키 */
export function paperKeyForSubject(code: string): PaperSubjectKey {
  if (code === "japanese") return "jafl";
  if (code === "math1" || code === "math2") return "math";
  if (code === "sogo") return "jw";
  return "science";
}

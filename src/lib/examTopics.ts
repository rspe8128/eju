/**
 * 과목별 단원(출제 영역) 태그.
 * 채점된 문항에 이 태그를 붙여서 약점 분석에 집계한다.
 * 기준: JASSO 공식 실러버스 (이과·종합과목·수학은 2026년도 개정판).
 */

export type Topic = {
  id: string;
  label: string;
  /** 일본어 원문 표기 — 기출 PDF에서 찾아보기 쉽도록 */
  ja?: string;
};

export const EXAM_TOPICS: Record<string, Topic[]> = {
  // ── 1순위: 일본어 ──────────────────────────────
  japanese: [
    { id: "jp-read-setsumei", label: "독해 · 설명문", ja: "説明文" },
    { id: "jp-read-ronsetsu", label: "독해 · 논설문", ja: "論説文" },
    { id: "jp-read-jitsuyo", label: "독해 · 실용문(공지·안내)", ja: "実用文" },
    { id: "jp-read-zuhyo", label: "독해 · 도표 해석", ja: "図表" },
    { id: "jp-read-shiji", label: "독해 · 지시어·접속사", ja: "指示語・接続" },
    { id: "jp-read-goi", label: "독해 · 어휘·표현", ja: "語彙" },
    { id: "jp-read-shushi", label: "독해 · 주지 파악", ja: "主旨把握" },
    { id: "jp-chodoku-zuhyo", label: "청독해 · 도표형", ja: "聴読解(図表)" },
    { id: "jp-chodoku-kogi", label: "청독해 · 강의형", ja: "聴読解(講義)" },
    { id: "jp-cho-kaiwa", label: "청해 · 회화", ja: "聴解(会話)" },
    { id: "jp-cho-kogi", label: "청해 · 강의", ja: "聴解(講義)" },
    { id: "jp-cho-iken", label: "청해 · 의견·논증", ja: "聴解(意見)" },
  ],

  // ── 2순위: 수학 ────────────────────────────────
  math1: [
    { id: "m1-kazu", label: "수와 식", ja: "数と式" },
    { id: "m1-nijikansu", label: "2차함수", ja: "二次関数" },
    { id: "m1-keiryo", label: "도형과 계량(삼각비)", ja: "図形と計量" },
    { id: "m1-kakuritsu", label: "경우의 수·확률", ja: "場合の数と確率" },
    { id: "m1-seisu", label: "정수의 성질", ja: "整数の性質" },
    { id: "m1-zukei", label: "도형의 성질", ja: "図形の性質" },
    { id: "m1-suretsu", label: "수열", ja: "数列" },
    { id: "m1-vector", label: "벡터", ja: "ベクトル" },
    { id: "m1-tokei", label: "데이터 분석·통계", ja: "データの分析" },
  ],
  math2: [
    { id: "m2-kazu", label: "수와 식·방정식", ja: "数と式・方程式" },
    { id: "m2-nijikansu", label: "2차함수", ja: "二次関数" },
    { id: "m2-keiryo", label: "도형과 계량", ja: "図形と計量" },
    { id: "m2-kakuritsu", label: "경우의 수·확률", ja: "場合の数と確率" },
    { id: "m2-seisu", label: "정수의 성질", ja: "整数の性質" },
    { id: "m2-shisu", label: "지수·로그함수", ja: "指数関数・対数関数" },
    { id: "m2-sankaku", label: "삼각함수", ja: "三角関数" },
    { id: "m2-bibun", label: "미분법", ja: "微分法" },
    { id: "m2-sekibun", label: "적분법", ja: "積分法" },
    { id: "m2-suretsu", label: "수열", ja: "数列" },
    { id: "m2-kyokugen", label: "수열·함수의 극한", ja: "極限" },
    { id: "m2-vector", label: "벡터", ja: "ベクトル" },
    { id: "m2-fukuso", label: "복소수평면", ja: "複素数平面" },
    { id: "m2-kyokusen", label: "식과 곡선", ja: "式と曲線" },
    { id: "m2-tokei", label: "확률분포·통계적 추측", ja: "確率分布と統計的な推測" },
  ],

  // ── 3순위: 종합과목 ────────────────────────────
  sogo: [
    { id: "sg-seiji", label: "정치 · 민주주의·헌법", ja: "政治" },
    { id: "sg-kokusai-seiji", label: "정치 · 국제정치", ja: "国際政治" },
    { id: "sg-keizai", label: "경제 · 시장·기업", ja: "経済" },
    { id: "sg-kokusai-keizai", label: "경제 · 국제경제·무역", ja: "国際経済" },
    { id: "sg-zaisei", label: "경제 · 재정·금융", ja: "財政・金融" },
    { id: "sg-shakai", label: "사회 · 인구·노동·복지", ja: "社会" },
    { id: "sg-chiri-shizen", label: "지리 · 자연환경", ja: "地理(自然)" },
    { id: "sg-chiri-jinbun", label: "지리 · 인문·산업", ja: "地理(人文)" },
    { id: "sg-rekishi-kindai", label: "역사 · 근대 세계", ja: "歴史(近代)" },
    { id: "sg-rekishi-gendai", label: "역사 · 현대 세계", ja: "歴史(現代)" },
    { id: "sg-nihon", label: "일본의 정치·경제·사회", ja: "日本" },
  ],

  // ── 4순위: 이과 ────────────────────────────────
  physics: [
    { id: "ph-rikigaku", label: "역학", ja: "力学" },
    { id: "ph-netsu", label: "열역학", ja: "熱" },
    { id: "ph-nami", label: "파동", ja: "波" },
    { id: "ph-denjiki", label: "전자기", ja: "電気と磁気" },
    { id: "ph-genshi", label: "원자·원자핵", ja: "原子" },
  ],
  chemistry: [
    { id: "ch-kosei", label: "물질의 구성·화학결합", ja: "物質の構成" },
    { id: "ch-jotai", label: "물질의 상태·기체·용액", ja: "物質の状態" },
    { id: "ch-hanno", label: "화학반응·열화학·평형", ja: "化学反応" },
    { id: "ch-santen", label: "산과 염기·산화환원·전기분해", ja: "酸と塩基・酸化還元" },
    { id: "ch-muki", label: "무기물질", ja: "無機物質" },
    { id: "ch-yuki", label: "유기화합물", ja: "有機化合物" },
    { id: "ch-kobunshi", label: "고분자화합물", ja: "高分子化合物" },
  ],
  biology: [
    { id: "bi-saibo", label: "세포와 분자", ja: "細胞と分子" },
    { id: "bi-taisha", label: "대사(광합성·호흡)", ja: "代謝" },
    { id: "bi-idenshi", label: "유전자와 발현", ja: "遺伝情報の発現" },
    { id: "bi-seishoku", label: "생식과 발생", ja: "生殖と発生" },
    { id: "bi-oto", label: "생물의 환경응답", ja: "生物の環境応答" },
    { id: "bi-seitai", label: "생태와 환경", ja: "生態と環境" },
    { id: "bi-shinka", label: "진화와 계통", ja: "進化と系統" },
  ],
};

export const UNTAGGED = "untagged";

export function getTopics(subjectCode: string): Topic[] {
  return EXAM_TOPICS[subjectCode] ?? [];
}

export function getTopicLabel(subjectCode: string, topicId: string): string {
  if (topicId === UNTAGGED) return "미분류";
  return getTopics(subjectCode).find((t) => t.id === topicId)?.label ?? topicId;
}

/** 마크시트에서 고를 수 있는 선택지 개수 (과목별 기본값) */
export function defaultChoiceCount(subjectCode: string): number {
  // 수학은 마크시트가 0~9 숫자칸 방식
  if (subjectCode === "math1" || subjectCode === "math2") return 10;
  // 이과는 ①~⑥
  if (["physics", "chemistry", "biology"].includes(subjectCode)) return 6;
  return 4;
}

/** 수학 마크시트 부호칸 값 */
export const MATH_SIGN = "s";


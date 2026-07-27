import type { ConceptItem, Item, ProblemItem, Subject, Unit } from "../types";

/**
 * 교과목(수학·종합과목·물리·화학·생물) 개념 노트 + 연습문제.
 * 실제 EJU 기출문제가 아니라 이 사이트가 직접 작성한 학습용 예시 문제다.
 * (JASSO 공식 기출은 저작권이 있어 그대로 옮길 수 없다 — 진짜 기출은 /guide의 공식 링크에서 받아서
 * 직접 등록해 쓰는 걸 권장한다.)
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

export const UNITS: Unit[] = [
  { id: "unit-math-1", subjectId: SUBJECT_IDS.math, title: "1단원: 이차방정식과 인수분해", order: 1 },
  { id: "unit-math-2", subjectId: SUBJECT_IDS.math, title: "2단원: 이차함수", order: 2 },
  { id: "unit-math-3", subjectId: SUBJECT_IDS.math, title: "3단원: 삼각비", order: 3 },
  { id: "unit-math-4", subjectId: SUBJECT_IDS.math, title: "4단원: 경우의 수와 확률", order: 4 },

  { id: "unit-sogo-1", subjectId: SUBJECT_IDS.sogo, title: "1단원: 정치 - 삼권분립", order: 1 },
  { id: "unit-sogo-2", subjectId: SUBJECT_IDS.sogo, title: "2단원: 경제 - 수요와 공급", order: 2 },
  { id: "unit-sogo-3", subjectId: SUBJECT_IDS.sogo, title: "3단원: 사회 - 저출산 고령화", order: 3 },
  { id: "unit-sogo-4", subjectId: SUBJECT_IDS.sogo, title: "4단원: 지리 - 인구 피라미드", order: 4 },
  { id: "unit-sogo-5", subjectId: SUBJECT_IDS.sogo, title: "5단원: 역사 - 산업혁명", order: 5 },

  { id: "unit-physics-1", subjectId: SUBJECT_IDS.physics, title: "1단원: 힘과 운동", order: 1 },
  { id: "unit-physics-2", subjectId: SUBJECT_IDS.physics, title: "2단원: 파동", order: 2 },

  { id: "unit-chemistry-1", subjectId: SUBJECT_IDS.chemistry, title: "1단원: 몰과 물질량", order: 1 },
  { id: "unit-chemistry-2", subjectId: SUBJECT_IDS.chemistry, title: "2단원: 산과 염기", order: 2 },

  { id: "unit-biology-1", subjectId: SUBJECT_IDS.biology, title: "1단원: 세포와 에너지", order: 1 },
  { id: "unit-biology-2", subjectId: SUBJECT_IDS.biology, title: "2단원: 유전", order: 2 },
];

function concept(id: string, unitId: string, title: string, markdown: string): ConceptItem {
  return { id, unitId, type: "concept", title, markdown };
}

function problem(
  id: string,
  unitId: string,
  title: string,
  question: string,
  answer: string,
  explanation: string
): ProblemItem {
  return { id, unitId, type: "problem", title, question, answer, explanation, solved: false };
}

export const ITEMS: Item[] = [
  // ── 수학 ──────────────────────────────────────────
  concept(
    "item-math-concept-1",
    "unit-math-1",
    "이차방정식",
    "## 이차방정식\n\nax² + bx + c = 0 형태의 방정식.\n\n### 근의 공식\n\nx = (-b ± √(b²-4ac)) / 2a\n\n### 일본어 용어\n- 二次方程式（にじほうていしき）\n- 解の公式（かいのこうしき）"
  ),
  problem(
    "item-math-problem-1",
    "unit-math-1",
    "이차방정식 풀이",
    "x² - 5x + 6 = 0 의 해를 구하시오.",
    "x = 2 또는 x = 3",
    "(x-2)(x-3) = 0 이므로 x = 2 또는 x = 3"
  ),
  problem(
    "item-math-problem-1b",
    "unit-math-1",
    "인수분해로 풀기",
    "x² - 2x - 15 = 0 의 해를 구하시오.",
    "x = 5 또는 x = -3",
    "곱이 -15, 합이 -2인 두 수는 -5와 3. (x-5)(x+3) = 0"
  ),
  concept(
    "item-math-concept-2",
    "unit-math-2",
    "이차함수의 그래프",
    "## 이차함수 y = ax² + bx + c\n\n그래프는 포물선이며, a > 0이면 아래로 볼록, a < 0이면 위로 볼록하다.\n\n### 꼭짓점 공식\n\n꼭짓점의 x좌표 = -b / (2a)\n\n### 일본어 용어\n- 二次関数（にじかんすう）\n- 頂点（ちょうてん）\n- 軸（じく）"
  ),
  problem(
    "item-math-problem-2",
    "unit-math-2",
    "꼭짓점 구하기",
    "y = x² - 4x + 3 의 꼭짓점 좌표를 구하시오.",
    "(2, -1)",
    "x = -(-4)/(2×1) = 2, y = 2² - 4×2 + 3 = -1"
  ),
  concept(
    "item-math-concept-3",
    "unit-math-3",
    "삼각비의 정의",
    "## 삼각비\n\n직각삼각형에서 각 θ에 대해\n\n- sinθ = 대변 / 빗변\n- cosθ = 인접변 / 빗변\n- tanθ = 대변 / 인접변\n\n### 일본어 용어\n- 三角比（さんかくひ）\n- 正弦（せいげん, sin）\n- 余弦（よげん, cos）\n- 正接（せいせつ, tan）"
  ),
  problem(
    "item-math-problem-3",
    "unit-math-3",
    "피타고라스 정리 응용",
    "직각삼각형의 빗변이 10, 한 변이 6일 때 나머지 한 변의 길이를 구하시오.",
    "8",
    "피타고라스 정리: √(10² - 6²) = √64 = 8 (6-8-10은 3-4-5 직각삼각형의 2배)"
  ),
  concept(
    "item-math-concept-4",
    "unit-math-4",
    "순열과 조합",
    "## 순열과 조합\n\n- 순열(nPr) = n! / (n-r)! : 순서를 고려해 나열\n- 조합(nCr) = n! / (r!(n-r)!) : 순서를 고려하지 않고 선택\n\n### 일본어 용어\n- 順列（じゅんれつ）\n- 組合せ（くみあわせ）\n- 場合の数（ばあいのかず）"
  ),
  problem(
    "item-math-problem-4",
    "unit-math-4",
    "순열",
    "5명 중에서 2명을 뽑아 일렬로 세우는 경우의 수를 구하시오.",
    "20",
    "5P2 = 5 × 4 = 20 (순서 고려)"
  ),
  problem(
    "item-math-problem-4b",
    "unit-math-4",
    "조합",
    "5명 중에서 2명을 뽑는 경우의 수를 구하시오. (순서 상관없음)",
    "10",
    "5C2 = (5×4)/(2×1) = 10"
  ),

  // ── 종합과목 ──────────────────────────────────────
  concept(
    "item-sogo-concept-1",
    "unit-sogo-1",
    "삼권분립",
    "## 三権分立（さんけんぶんりつ）\n\n- **立法**: 国会\n- **行政**: 内閣\n- **司法**: 裁判所\n\n相互に抑制と均衡を図る制度。"
  ),
  problem(
    "item-sogo-problem-1",
    "unit-sogo-1",
    "내각불신임",
    "内閣不信任決議が可決された場合、内閣はどのような選択をするか？",
    "総辞職するか、10日以内に衆議院を解散する",
    "憲法第69条"
  ),
  concept(
    "item-sogo-concept-2",
    "unit-sogo-2",
    "수요와 공급",
    "## 수요와 공급\n\n수요곡선은 우하향, 공급곡선은 우상향한다. 두 곡선이 만나는 점에서 균형가격과 균형거래량이 결정된다.\n\n### 일본어 용어\n- 需要（じゅよう）: 수요\n- 供給（きょうきゅう）: 공급\n- 均衡価格（きんこうかかく）: 균형가격"
  ),
  problem(
    "item-sogo-problem-2",
    "unit-sogo-2",
    "균형가격의 변화",
    "수요가 증가하고 공급은 일정할 때, 균형가격은 어떻게 변화하는가?",
    "상승한다",
    "수요곡선이 오른쪽으로 이동하면 균형점이 더 높은 가격에서 형성된다"
  ),
  concept(
    "item-sogo-concept-3",
    "unit-sogo-3",
    "저출산 고령화",
    "## 저출산 고령화（少子高齢化）\n\n출생률 저하와 평균수명 증가로 생산연령인구 비율이 줄고 고령인구 비율이 느는 현상. 사회보장 재정에 부담을 준다.\n\n### 일본어 용어\n- 少子高齢化（しょうしこうれいか）\n- 生産年齢人口（せいさんねんれいじんこう）\n- 社会保障（しゃかいほしょう）"
  ),
  problem(
    "item-sogo-problem-3",
    "unit-sogo-3",
    "저출산 고령화의 영향",
    "저출산 고령화가 사회보장 제도에 미치는 영향을 간단히 설명하시오.",
    "생산연령인구가 줄어 연금·의료비 부담이 증가한다",
    "고령인구 비율 증가로 복지 지출이 늘고, 이를 지탱할 생산연령인구는 줄어든다"
  ),
  concept(
    "item-sogo-concept-4",
    "unit-sogo-4",
    "인구 피라미드",
    "## 인구 피라미드（人口ピラミッド）\n\n연령별·성별 인구 구성을 나타낸 그래프. 출생률이 높은 개발도상국은 피라미드형(富士山型), 저출산 국가는 항아리형(つぼ型)을 보인다.\n\n### 일본어 용어\n- 人口ピラミッド\n- 富士山型: 피라미드형(다산다사)\n- つぼ型: 항아리형(저출산 고령화)"
  ),
  problem(
    "item-sogo-problem-4",
    "unit-sogo-4",
    "인구 피라미드 형태",
    "저출산 고령화가 진행된 국가의 인구 피라미드 형태로 알맞은 것은?",
    "항아리형(つぼ型)",
    "유소년층이 적고 고령층 비중이 높아 위가 넓고 아래가 좁은 형태가 된다"
  ),
  concept(
    "item-sogo-concept-5",
    "unit-sogo-5",
    "산업혁명",
    "## 산업혁명（産業革命）\n\n18세기 후반 영국에서 시작된 기술혁신과 생산방식의 변화. 공장제 기계공업이 확산되며 도시화와 노동문제가 대두되었다.\n\n### 일본어 용어\n- 産業革命（さんぎょうかくめい）\n- 工場制機械工業（こうじょうせいきかいこうぎょう）\n- 都市化（としか）"
  ),
  problem(
    "item-sogo-problem-5",
    "unit-sogo-5",
    "산업혁명의 사회적 변화",
    "산업혁명이 사회에 가져온 대표적인 변화 두 가지를 쓰시오.",
    "도시화 촉진, 노동문제(아동노동·장시간노동 등) 대두",
    "공장제 기계공업의 확산으로 인구가 도시로 집중되고 열악한 노동환경 문제가 발생했다"
  ),

  // ── 물리 ──────────────────────────────────────────
  concept(
    "item-physics-concept-1",
    "unit-physics-1",
    "힘과 운동",
    "## 힘과 운동\n\n뉴턴의 운동 제2법칙: F = ma (힘 = 질량 × 가속도)\n\n### 일본어 용어\n- 力（ちから）: 힘\n- 質量（しつりょう）: 질량\n- 加速度（かそくど）: 가속도"
  ),
  problem(
    "item-physics-problem-1",
    "unit-physics-1",
    "가속도 계산",
    "질량 2kg인 물체에 10N의 힘을 가할 때 가속도를 구하시오.",
    "5 m/s²",
    "a = F / m = 10 / 2 = 5"
  ),
  concept(
    "item-physics-concept-2",
    "unit-physics-2",
    "파동의 기본량",
    "## 파동의 기본량\n\n파장(λ), 진동수(f), 파동의 속력(v) 사이에는 v = fλ 관계가 성립한다.\n\n### 일본어 용어\n- 波長（はちょう）: 파장\n- 振動数（しんどうすう）: 진동수"
  ),
  problem(
    "item-physics-problem-2",
    "unit-physics-2",
    "파동의 속력",
    "진동수가 5Hz, 파장이 2m인 파동의 속력을 구하시오.",
    "10 m/s",
    "v = fλ = 5 × 2 = 10"
  ),

  // ── 화학 ──────────────────────────────────────────
  concept(
    "item-chemistry-concept-1",
    "unit-chemistry-1",
    "몰(mol)",
    "## 몰(mol)\n\n1몰 = 6.02×10²³개의 입자(아보가드로 수). 물질량(mol) = 질량(g) ÷ 몰질량(g/mol)\n\n### 일본어 용어\n- モル: 몰\n- 物質量（ぶっしつりょう）: 물질량\n- モル質量: 몰질량"
  ),
  problem(
    "item-chemistry-problem-1",
    "unit-chemistry-1",
    "물질량 계산",
    "물(H₂O) 18g은 몇 몰인가? (물의 몰질량은 18 g/mol)",
    "1 mol",
    "18g ÷ 18g/mol = 1 mol"
  ),
  concept(
    "item-chemistry-concept-2",
    "unit-chemistry-2",
    "산과 염기의 중화",
    "## 산과 염기의 중화\n\n산과 염기가 반응하면 물과 염이 생성되는 중화반응이 일어난다. HCl + NaOH → NaCl + H₂O\n\n### 일본어 용어\n- 酸（さん）: 산\n- 塩基（えんき）: 염기\n- 中和（ちゅうわ）: 중화"
  ),
  problem(
    "item-chemistry-problem-2",
    "unit-chemistry-2",
    "중화반응 생성물",
    "염산(HCl)과 수산화나트륨(NaOH)이 중화 반응할 때 생성되는 물질 두 가지는?",
    "염화나트륨(NaCl)과 물(H₂O)",
    "HCl + NaOH → NaCl + H₂O"
  ),

  // ── 생물 ──────────────────────────────────────────
  concept(
    "item-biology-concept-1",
    "unit-biology-1",
    "광합성과 호흡",
    "## 광합성과 호흡\n\n광합성: 이산화탄소 + 물 → 포도당 + 산소 (빛에너지 이용)\n호흡: 포도당 + 산소 → 이산화탄소 + 물 (에너지 방출)\n\n### 일본어 용어\n- 光合成（こうごうせい）: 광합성\n- 呼吸（こきゅう）: 호흡"
  ),
  problem(
    "item-biology-problem-1",
    "unit-biology-1",
    "광합성의 원료",
    "광합성에 필요한 두 가지 원료 물질은?",
    "이산화탄소와 물",
    "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (빛에너지 이용)"
  ),
  concept(
    "item-biology-concept-2",
    "unit-biology-2",
    "멘델의 분리의 법칙",
    "## 멘델의 분리의 법칙\n\n순종 우성(AA)과 순종 열성(aa)을 교배하면 잡종 1대는 모두 우성 형질(Aa)을 나타낸다.\n\n### 일본어 용어\n- 遺伝子（いでんし）: 유전자\n- 優性（ゆうせい）: 우성\n- 劣性（れっせい）: 열성"
  ),
  problem(
    "item-biology-problem-2",
    "unit-biology-2",
    "잡종 1대의 유전자형",
    "순종 우성(AA)과 순종 열성(aa)을 교배했을 때 잡종 1대(F1)의 유전자형은?",
    "Aa (모두 이형접합)",
    "AA × aa → 모든 자손이 Aa"
  ),
];

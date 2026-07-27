export type WritingPrompt = {
  id: string;
  type: "debate" | "explain";
  title: string;
  prompt: string;
};

export const writingPrompts: WritingPrompt[] = [
  {
    id: "w1",
    type: "debate",
    title: "원격 수업",
    prompt:
      "大学の授業をすべてオンラインで行うことについて、賛成と反対の意見があります。あなたはどちらの意見に賛成ですか。理由を述べて論じなさい。",
  },
  {
    id: "w2",
    type: "debate",
    title: "현금 없는 사회",
    prompt:
      "現金を使わない社会（キャッシュレス社会）を進めるべきだという意見と、現金は必要だという意見があります。あなたの考えを述べなさい。",
  },
  {
    id: "w3",
    type: "explain",
    title: "저출산",
    prompt:
      "日本では少子化が進んでいます。その原因を説明し、今後どのような対策が必要か述べなさい。",
  },
  {
    id: "w4",
    type: "debate",
    title: "AI 활용",
    prompt:
      "人工知能（AI）を教育に積極的に取り入れることについて、賛否両論があります。あなたの意見を述べなさい。",
  },
  {
    id: "w5",
    type: "explain",
    title: "고령화",
    prompt:
      "高齢化社会がもたらす問題を挙げ、それに対する解決策を論じなさい。",
  },
  {
    id: "w6",
    type: "debate",
    title: "교복",
    prompt:
      "学校で制服を義務づけることについて賛成・反対の意見があります。あなたの考えを述べなさい。",
  },
  {
    id: "w7",
    type: "explain",
    title: "환경 문제",
    prompt:
      "地球温暖化の現状を説明し、個人・企業・政府がそれぞれできる対策を述べなさい。",
  },
  {
    id: "w8",
    type: "debate",
    title: "SNS",
    prompt:
      "SNSの利用を高校生に制限すべきだという意見があります。賛成か反対か、理由を述べなさい。",
  },
  {
    id: "w9",
    type: "explain",
    title: "도시와 지방",
    prompt:
      "地方から都市への人口集中が進んでいます。その背景と影響、そして対策を論じなさい。",
  },
  {
    id: "w10",
    type: "debate",
    title: "외국인 노동자",
    prompt:
      "日本が外国人労働者を積極的に受け入れるべきかどうかについて、あなたの意見を述べなさい。",
  },
  {
    id: "w11",
    type: "explain",
    title: "정보 사회",
    prompt:
      "情報化社会の利点と問題点を説明し、私たちが注意すべきことを述べなさい。",
  },
  {
    id: "w12",
    type: "debate",
    title: "대학 무상화",
    prompt:
      "大学の授業料を無料にすべきだという意見があります。賛成・反対の立場から論じなさい。",
  },
  {
    id: "w13",
    type: "explain",
    title: "자원 에너지",
    prompt:
      "日本のエネルギー問題について現状を説明し、将来のエネルギー政策について述べなさい。",
  },
  {
    id: "w14",
    type: "debate",
    title: "재택근무",
    prompt:
      "テレワーク（在宅勤務）を推進すべきかどうかについて、あなたの考えを述べなさい。",
  },
  {
    id: "w15",
    type: "explain",
    title: "관광",
    prompt:
      "オーバーツーリズム（観光公害）の問題を説明し、持続可能な観光のあり方を論じなさい。",
  },
  {
    id: "w16",
    type: "debate",
    title: "성별 역할",
    prompt:
      "家庭における男女の役割分担について、伝統的な考え方と新しい考え方があります。あなたの意見を述べなさい。",
  },
  {
    id: "w17",
    type: "explain",
    title: "교통",
    prompt:
      "都市の交通渋滞の原因を説明し、その解決策を述べなさい。",
  },
  {
    id: "w18",
    type: "debate",
    title: "동물원",
    prompt:
      "動物園は動物の権利を侵害しているという意見があります。動物園のあり方について論じなさい。",
  },
  {
    id: "w19",
    type: "explain",
    title: "식량",
    prompt:
      "食料自給率の低下が問題となっています。その原因と対策を述べなさい。",
  },
  {
    id: "w20",
    type: "debate",
    title: "유전자 편집",
    prompt:
      "遺伝子編集技術を人間に応用することについて、賛成と反対の意見があります。あなたの考えを述べなさい。",
  },
];

import { DeckStudyView } from "@/components/study/DeckStudyView";

export default function ToeflPage() {
  return (
    <DeckStudyView
      subject="toefl"
      subjectLabel="토플 (대학 영어 · EJU 과목 아님)"
      tabs={[
        { key: "vocab", label: "단어", type: "vocab" },
        { key: "grammar", label: "표현", type: "grammar" },
      ]}
    />
  );
}

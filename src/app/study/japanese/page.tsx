import { DeckStudyView } from "@/components/study/DeckStudyView";

export default function JapanesePage() {
  return (
    <DeckStudyView
      subject="japanese"
      subjectLabel="일본어"
      tabs={[
        { key: "vocab", label: "단어", type: "vocab" },
        { key: "grammar", label: "문법", type: "grammar" },
        { key: "kanji", label: "한자", type: "kanji" },
      ]}
    />
  );
}

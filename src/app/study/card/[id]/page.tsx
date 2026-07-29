import { SingleCardView } from "@/components/study/SingleCardView";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SingleCardPage({ params }: Props) {
  const { id } = await params;
  return <SingleCardView cardId={id} />;
}

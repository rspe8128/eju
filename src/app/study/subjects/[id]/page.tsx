import { SubjectDetailView } from "@/components/subjects/SubjectDetailView";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SubjectDetailPage({ params }: Props) {
  const { id } = await params;
  return <SubjectDetailView subjectId={id} />;
}

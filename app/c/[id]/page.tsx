import CircleDetail from "@/components/circle-detail";

export default async function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CircleDetail id={id} />;
}

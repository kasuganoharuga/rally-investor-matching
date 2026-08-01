import { MatchRunPage } from "@/features/matching";

type PageProps = {
  params: Promise<{ runId: string }>;
};

export default async function MatchRun({ params }: PageProps) {
  const { runId } = await params;
  return <MatchRunPage runId={runId} />;
}

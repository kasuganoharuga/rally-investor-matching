import { MatchingPage } from "@/features/matching";

type PageProps = {
  searchParams: Promise<{ rematch?: string | string[] }>;
};

export default async function MatchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rematchId = Array.isArray(params.rematch) ? params.rematch[0] : params.rematch;
  return <MatchingPage rematchId={rematchId} />;
}

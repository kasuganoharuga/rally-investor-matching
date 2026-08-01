import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/features/auth/server/page-guards";
import { MatchRunWorkspace } from "@/features/matching/components/match-run-workspace";

export async function MatchRunPage({ runId }: { runId: string }) {
  const user = await requirePageUser();

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader active="match" user={user} />
      <MatchRunWorkspace runId={runId} />
    </main>
  );
}

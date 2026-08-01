import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/features/auth/server/page-guards";
import { MatchHistoryWorkspace } from "@/features/matching/components/match-history-workspace";

export async function MatchHistoryPage() {
  const user = await requirePageUser();

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader active="match" user={user} />
      <MatchHistoryWorkspace />
    </main>
  );
}

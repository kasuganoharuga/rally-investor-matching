import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/features/auth/server/page-guards";
import { MatchingWorkspace } from "@/features/matching/components/matching-workspace";

export async function MatchingPage() {
  const user = await requirePageUser();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="match" user={user} />
      <MatchingWorkspace />
    </main>
  );
}

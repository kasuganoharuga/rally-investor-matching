import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/features/auth/server/session";
import { MatchingWorkspace } from "@/features/matching/components/matching-workspace";

export async function MatchingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="match" user={user} />

      <div className="mx-auto w-full max-w-7xl px-5 py-5">
        <MatchingWorkspace />
      </div>
    </main>
  );
}

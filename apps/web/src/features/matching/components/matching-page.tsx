import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/features/auth/server/page-guards";
import {
  MatchingWorkspace,
  type MatchIntakeVariant,
} from "@/features/matching/components/matching-workspace";

export async function MatchingPage({
  intakeVariant = "structured",
}: {
  intakeVariant?: MatchIntakeVariant;
}) {
  const user = await requirePageUser();

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader active="match" user={user} />
      <MatchingWorkspace intakeVariant={intakeVariant} />
    </main>
  );
}

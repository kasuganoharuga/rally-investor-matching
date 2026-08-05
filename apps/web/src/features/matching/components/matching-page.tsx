import { SiteHeader } from "@/components/site-header";
import { canConfigureMatching } from "@/features/auth/role-policy";
import { requirePageUser } from "@/features/auth/server/page-guards";
import {
  MatchingWorkspace,
  type MatchIntakeVariant,
} from "@/features/matching/components/matching-workspace";
import { matchingHistoryService } from "@/features/matching/server/services/matching-history-service";

export async function MatchingPage({
  intakeVariant = "structured",
  rematchId,
}: {
  intakeVariant?: MatchIntakeVariant;
  rematchId?: string;
}) {
  const user = await requirePageUser();
  const rematchRecord = rematchId
    ? await matchingHistoryService.getRun(rematchId, user)
    : null;

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader active="match" user={user} />
      <MatchingWorkspace
        intakeVariant={intakeVariant}
        rematchRecord={rematchRecord}
        canConfigureMatching={canConfigureMatching(user.role)}
      />
    </main>
  );
}

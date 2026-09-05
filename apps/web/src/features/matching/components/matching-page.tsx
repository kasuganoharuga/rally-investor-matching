import { SiteHeader } from "@/components/site-header";
import { canConfigureMatching } from "@/features/auth/role-policy";
import { requirePageUser } from "@/features/auth/server/page-guards";
import {
  MatchingWorkspace,
  type MatchIntakeVariant,
} from "@/features/matching/components/matching-workspace";
import { matchingHistoryService } from "@/features/matching/server/services/matching-history-service";
import { matchingSettingsService } from "@/features/matching/server/services/matching-settings-service";
import type { MatchRecord } from "@/features/matching/types/match";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/server/logger";

/**
 * `?rematch=` is a URL the user can edit, bookmark, or keep after the run is
 * gone — a malformed id, someone else's run, or a deleted one all make
 * getRun() throw a 404 ApiError. Uncaught, that took down the whole server
 * component and replaced the workspace with Next's error screen. A rematch id
 * we can't honour is not an error state: fall through to a blank new match,
 * which is what the user gets from /match anyway.
 */
async function loadRematchRecord(
  rematchId: string | undefined,
  user: Awaited<ReturnType<typeof requirePageUser>>,
): Promise<MatchRecord | null> {
  if (!rematchId) {
    return null;
  }
  try {
    return await matchingHistoryService.getRun(rematchId, user);
  } catch (error) {
    // Only "that run isn't available to you" degrades to a blank intake.
    // A database outage or any other fault must still surface: swallowing it
    // would silently discard the rematch the user asked for *and* hide a real
    // incident behind a form that looks like it worked.
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }
    logger.error("rematch_record_unavailable", {
      userId: user.id,
      errorClass: "rematch_unavailable",
    });
    return null;
  }
}

export async function MatchingPage({
  intakeVariant = "structured",
  rematchId,
}: {
  intakeVariant?: MatchIntakeVariant;
  rematchId?: string;
}) {
  const user = await requirePageUser();
  const rematchRecord = await loadRematchRecord(rematchId, user);
  const matchingSettings = await matchingSettingsService.getForUser(user);

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader active="match" user={user} />
      <MatchingWorkspace
        intakeVariant={intakeVariant}
        rematchRecord={rematchRecord}
        canConfigureMatching={canConfigureMatching(user.role)}
        userRole={user.role}
        matchingSettings={matchingSettings}
      />
    </main>
  );
}

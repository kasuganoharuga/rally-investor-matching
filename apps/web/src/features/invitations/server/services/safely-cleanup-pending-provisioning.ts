import "server-only";

import { cleanupFreshProvisionedUser } from "@/features/auth/server/provision-user";
import {
  findInvitationForUpdate,
  markRevoked,
} from "@/features/invitations/server/repositories/invitation-repository";
import { withTransaction } from "@/lib/server/db";
import { logger } from "@/lib/server/logger";

export type SafelyCleanupOutcome = "accepted" | "cleaned" | "uncertain";

/**
 * Runs the phase-B compensation (checking invitation status and, if
 * safe, cleaning up the freshly provisioned user) as one transaction
 * with a `SELECT ... FOR UPDATE` row lock, closing the "read the
 * status, then act on a stale read" race a separate read+write pair
 * would have.
 */
export async function safelyCleanupPendingProvisioning(input: {
  invitationId: string;
  userId: string;
  email: string;
}): Promise<SafelyCleanupOutcome> {
  return withTransaction(async (client) => {
    const invitation = await findInvitationForUpdate(client, input.invitationId);

    if (invitation?.status === "accepted" && invitation.acceptedBy === input.userId) {
      // Someone else's concurrent request already accepted it — nothing
      // to clean up, this is actually a success.
      return "accepted" as const;
    }

    if (invitation?.status !== "pending" && invitation?.status !== "revoked") {
      // Neither "safe to clean up" nor "confirmed already succeeded".
      return "uncertain" as const;
    }

    await cleanupFreshProvisionedUser(
      { userId: input.userId, email: input.email },
      client,
    );

    if (invitation.status === "pending") {
      const revoked = await markRevoked(input.invitationId, client);
      if (!revoked) {
        // Status changed even while we held the row lock — should be
        // impossible, but treat it as a transaction failure rather than
        // silently continuing.
        throw new Error("Invitation changed while row lock was held");
      }
    }

    return "cleaned" as const;
  }).catch(() => {
    // "uncertain" here means the application could not confirm the
    // outcome — NOT that nothing happened. A COMMIT can fail on the way
    // back to the client after the database already applied it. Callers
    // must stop and require reconciliation, never retry cleanup from this.
    logger.error("safely_cleanup_pending_provisioning_failed", {
      invitationId: input.invitationId,
      userId: input.userId,
    });
    return "uncertain" as const;
  });
}

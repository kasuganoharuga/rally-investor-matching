import "server-only";

import { isProvisionUserError } from "@/features/auth/server/errors";
import { provisionUser } from "@/features/auth/server/provision-user";
import { ensureUserProfile } from "@/features/auth/server/repositories/user-profile-repository";
import type { CurrentUser } from "@/features/auth/server/session";
import type { UserRole } from "@/features/auth/types/auth";
import { InvitationError } from "@/features/invitations/server/errors";
import { canInviteRole } from "@/features/invitations/invite-role-policy";
import { generateInternalInvitationRecordToken } from "@/features/invitations/server/invitation-token";
import {
  findById,
  insertPending,
  listAll,
  listByInviter,
  markAccepted,
  markRevoked,
} from "@/features/invitations/server/repositories/invitation-repository";
import { safelyCleanupPendingProvisioning } from "@/features/invitations/server/services/safely-cleanup-pending-provisioning";
import type {
  CreateInvitationInput,
  InvitationSummary,
} from "@/features/invitations/types/invitation";
import { getEmailProvider } from "@/lib/server/email/get-email-provider";
import { logger } from "@/lib/server/logger";
import { normalizeEmail } from "@/lib/server/normalize-email";

const INVITATION_RECORD_TTL_MS = 24 * 60 * 60 * 1000;

/** Both codes mean "no evidence either way" — never markRevoked on these. */
function isReconciliationCause(error: unknown): boolean {
  return (
    isProvisionUserError(error, "PROVISIONING_RESULT_UNCERTAIN") ||
    isProvisionUserError(error, "PROVISIONING_CLEANUP_FAILED")
  );
}

export class InvitationService {
  async listForViewer(viewer: CurrentUser): Promise<InvitationSummary[]> {
    if (viewer.role === "admin") {
      return listAll();
    }
    return listByInviter(viewer.id);
  }

  /**
   * Creates the invitation record and immediately provisions the
   * account (this round has no separate "click a link to register"
   * step — the invitee gets a temporary password by email instead).
   * Every failure path below chooses between "safe to undo" and
   * "must not touch anything, requires reconciliation" rather than
   * guessing.
   */
  async createInvitation(
    input: CreateInvitationInput,
    inviter: CurrentUser,
  ): Promise<InvitationSummary> {
    const role: UserRole = input.role ?? "founder";
    if (!canInviteRole(inviter.role, role)) {
      throw new InvitationError("ROLE_NOT_ALLOWED");
    }

    const email = normalizeEmail(input.email);
    const invitation = await insertPending({
      email,
      role,
      invitedBy: inviter.id,
      token: generateInternalInvitationRecordToken(),
      expiresAt: new Date(Date.now() + INVITATION_RECORD_TTL_MS),
    });

    const provisioned = await this.provisionOrRevoke(invitation, {
      email,
      role,
      invitedBy: inviter.id,
    });

    await this.finishAcceptanceOrCleanup(invitation.id, provisioned);
    await this.sendInvitationEmailBestEffort(invitation.id, {
      to: provisioned.email,
      role,
      temporaryPassword: provisioned.temporaryPassword,
      invitedByName: inviter.name,
    });

    const finalInvitation = await findById(invitation.id);
    return finalInvitation ?? invitation;
  }

  async revokeInvitation(id: string, inviter: CurrentUser): Promise<"revoked"> {
    const invitation = await findById(
      id,
      inviter.role === "admin" ? {} : { onlyInvitedBy: inviter.id },
    );
    if (!invitation) {
      throw new InvitationError("INVITATION_NOT_FOUND");
    }
    if (invitation.status === "accepted") {
      throw new InvitationError("ACCOUNT_ALREADY_PROVISIONED");
    }

    const revoked = await markRevoked(id);
    if (revoked) {
      return "revoked";
    }

    // Status changed between the read above and this write — re-check
    // rather than assume either outcome.
    const current = await findById(id);
    if (current?.status === "revoked") {
      return "revoked";
    }
    if (current?.status === "accepted") {
      throw new InvitationError("ACCOUNT_ALREADY_PROVISIONED");
    }
    throw new InvitationError("PROVISIONING_RECONCILIATION_REQUIRED", 500, {
      safeLogContext: { invitationId: id },
    });
  }

  /** Phase A: provisionUser() succeeds, or the invitation gets revoked. */
  private async provisionOrRevoke(
    invitation: InvitationSummary,
    input: { email: string; role: UserRole; invitedBy: string },
  ) {
    try {
      return await provisionUser(input);
    } catch (error) {
      if (isReconciliationCause(error)) {
        throw new InvitationError("PROVISIONING_RECONCILIATION_REQUIRED", 500, {
          cause: error,
          safeLogContext: { invitationId: invitation.id },
        });
      }

      // provisionUser confirmed nothing was left behind for this call —
      // safe to revoke, but markRevoked's own result still needs confirming.
      const revoked = await markRevoked(invitation.id);
      if (!revoked) {
        const current = await findById(invitation.id).catch(() => null);
        if (current?.status !== "revoked") {
          throw new InvitationError("PROVISIONING_RECONCILIATION_REQUIRED", 500, {
            safeLogContext: { invitationId: invitation.id },
          });
        }
        // Re-read confirmed a concurrent handler already revoked it.
      }
      throw error;
    }
  }

  /**
   * Phase B: profile + accept happy path, or the transactional,
   * row-locked compensation in safelyCleanupPendingProvisioning().
   */
  private async finishAcceptanceOrCleanup(
    invitationId: string,
    provisioned: { userId: string; email: string },
  ): Promise<void> {
    try {
      await ensureUserProfile(provisioned.userId);
      const accepted = await markAccepted(invitationId, provisioned.userId);
      if (!accepted) {
        throw new Error("markAccepted did not hit a pending row");
      }
    } catch {
      const outcome = await safelyCleanupPendingProvisioning({
        invitationId,
        userId: provisioned.userId,
        email: provisioned.email,
      });

      if (outcome === "uncertain") {
        throw new InvitationError("PROVISIONING_RECONCILIATION_REQUIRED", 500, {
          safeLogContext: { invitationId },
        });
      }
      if (outcome === "cleaned") {
        throw new InvitationError("PROVISIONING_FAILED", 500, {
          safeLogContext: { invitationId },
        });
      }
      // outcome === "accepted": a concurrent request already finished
      // this invitation successfully — fall through to send the email.
    }
  }

  /** Phase C: delivery failure only needs a log, everything else already committed. */
  private async sendInvitationEmailBestEffort(
    invitationId: string,
    input: {
      to: string;
      role: UserRole;
      temporaryPassword: string;
      invitedByName: string;
    },
  ): Promise<void> {
    try {
      await getEmailProvider().sendInvitation(input);
    } catch {
      logger.error("invitation_email_send_failed", { invitationId });
    }
  }
}

export const invitationService = new InvitationService();

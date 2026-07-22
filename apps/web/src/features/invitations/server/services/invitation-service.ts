import "server-only";

import { provisionUser } from "@/features/auth/server/provision-user";
import { ensureUserProfile } from "@/features/auth/server/repositories/user-profile-repository";
import type { CurrentUser } from "@/features/auth/server/session";
import type { UserRole } from "@/features/auth/types/auth";
import { canInviteRole } from "@/features/invitations/invite-role-policy";
import { InvitationError } from "@/features/invitations/server/errors";
import { generateInvitationToken } from "@/features/invitations/server/invitation-token";
import {
  findById,
  findByToken,
  insertPending,
  listAll,
  listByInviter,
  markAccepted,
  markExpired,
  markRevoked,
} from "@/features/invitations/server/repositories/invitation-repository";
import { safelyCleanupPendingProvisioning } from "@/features/invitations/server/services/safely-cleanup-pending-provisioning";
import type {
  AcceptedInvitation,
  AcceptInvitationInput,
  CreateInvitationInput,
  InvitationSummary,
  PublicInvitation,
} from "@/features/invitations/types/invitation";
import { getEmailProvider } from "@/lib/server/email/get-email-provider";
import { logger } from "@/lib/server/logger";
import { normalizeEmail } from "@/lib/server/normalize-email";

const INVITATION_RECORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isExpired(invitation: InvitationSummary): boolean {
  return new Date(invitation.expiresAt).getTime() <= Date.now();
}

function publicInvitation(invitation: InvitationSummary): PublicInvitation {
  return {
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
  };
}

function getAppBaseUrl(): string {
  const baseUrl = process.env.APP_BASE_URL ?? process.env.BETTER_AUTH_URL;
  if (!baseUrl) {
    throw new Error("APP_BASE_URL or BETTER_AUTH_URL is not configured");
  }
  return baseUrl;
}

function buildAcceptUrl(token: string): string {
  return new URL(`/invite/${token}`, getAppBaseUrl()).toString();
}

export class InvitationService {
  async listForViewer(viewer: CurrentUser): Promise<InvitationSummary[]> {
    if (viewer.role === "admin") {
      return listAll();
    }
    return listByInviter(viewer.id);
  }

  /**
   * Creates a pending invitation and emails an accept link. The user is
   * not provisioned here; account creation happens only after the invitee
   * opens the token link and sets their password.
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
    const token = generateInvitationToken();
    const invitation = await insertPending({
      email,
      role,
      invitedBy: inviter.id,
      token,
      expiresAt: new Date(Date.now() + INVITATION_RECORD_TTL_MS),
    });

    await this.sendInvitationEmailOrRevoke(invitation, {
      acceptUrl: buildAcceptUrl(token),
      invitedByName: inviter.name,
    });

    return invitation;
  }

  async getPublicInvitation(token: string): Promise<PublicInvitation> {
    const invitation = await this.requirePendingInvitationByToken(token);
    return publicInvitation(invitation);
  }

  async acceptInvitation(input: AcceptInvitationInput): Promise<AcceptedInvitation> {
    const invitation = await this.requirePendingInvitationByToken(input.token);

    const provisioned = await provisionUser({
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invitedBy ?? undefined,
      password: input.password,
    });

    await this.finishAcceptanceOrCleanup(invitation.id, provisioned);

    return {
      email: provisioned.email,
      role: invitation.role,
    };
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

  private async requirePendingInvitationByToken(
    token: string,
  ): Promise<InvitationSummary> {
    const invitation = await findByToken(token);
    if (!invitation || invitation.status === "revoked") {
      throw new InvitationError("INVITATION_NOT_FOUND");
    }
    if (invitation.status === "accepted") {
      throw new InvitationError("ACCOUNT_ALREADY_PROVISIONED");
    }
    if (invitation.status === "expired") {
      throw new InvitationError("INVITATION_EXPIRED");
    }
    if (isExpired(invitation)) {
      await markExpired(invitation.id);
      throw new InvitationError("INVITATION_EXPIRED");
    }
    return invitation;
  }

  private async sendInvitationEmailOrRevoke(
    invitation: InvitationSummary,
    input: { acceptUrl: string; invitedByName: string },
  ): Promise<void> {
    try {
      await getEmailProvider().sendInvitation({
        to: invitation.email,
        role: invitation.role,
        invitedByName: input.invitedByName,
        acceptUrl: input.acceptUrl,
        expiresAt: new Date(invitation.expiresAt),
      });
    } catch (error) {
      await markRevoked(invitation.id).catch(() => undefined);
      logger.error("invitation_email_send_failed", { invitationId: invitation.id });
      throw new InvitationError("INVITATION_EMAIL_FAILED", undefined, {
        cause: error,
        safeLogContext: { invitationId: invitation.id },
      });
    }
  }

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
    }
  }
}

export const invitationService = new InvitationService();

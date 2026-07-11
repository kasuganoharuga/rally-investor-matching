import { ApiError, type SafeLogContext } from "@/lib/api/errors";

export type InvitationErrorCode =
  | "ROLE_NOT_ALLOWED"
  | "INVITATION_ALREADY_PENDING"
  | "INVITATION_NOT_FOUND"
  | "PROVISIONING_RECONCILIATION_REQUIRED"
  | "PROVISIONING_FAILED"
  | "ACCOUNT_ALREADY_PROVISIONED";

const DEFAULT_STATUS: Record<InvitationErrorCode, number> = {
  ROLE_NOT_ALLOWED: 400,
  INVITATION_ALREADY_PENDING: 409,
  INVITATION_NOT_FOUND: 404,
  PROVISIONING_RECONCILIATION_REQUIRED: 500,
  PROVISIONING_FAILED: 500,
  ACCOUNT_ALREADY_PROVISIONED: 409,
};

const DEFAULT_MESSAGE: Record<InvitationErrorCode, string> = {
  ROLE_NOT_ALLOWED: "You are not allowed to invite this role.",
  INVITATION_ALREADY_PENDING: "There is already a pending invitation for this email.",
  INVITATION_NOT_FOUND: "Invitation not found.",
  PROVISIONING_RECONCILIATION_REQUIRED:
    "Could not confirm the result of provisioning this invitation. Manual reconciliation is required.",
  PROVISIONING_FAILED: "Could not provision an account for this invitation.",
  ACCOUNT_ALREADY_PROVISIONED:
    "This invitation has already been accepted; the account cannot be revoked here.",
};

/**
 * Every invitation-flow failure mode as one error type with a fixed
 * code -> default status mapping, matching ProvisionUserError's shape
 * so both flow through withApiErrorHandling identically.
 */
export class InvitationError extends ApiError {
  constructor(
    code: InvitationErrorCode,
    status: number = DEFAULT_STATUS[code],
    options?: { message?: string; cause?: unknown; safeLogContext?: SafeLogContext },
  ) {
    super({
      code,
      status,
      message: options?.message ?? DEFAULT_MESSAGE[code],
      safeLogContext: options?.safeLogContext,
    });
    this.name = "InvitationError";
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

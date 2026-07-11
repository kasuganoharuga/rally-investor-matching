import { ApiError, type SafeLogContext } from "@/lib/api/errors";

export type ProvisionUserErrorCode =
  | "EMAIL_ALREADY_EXISTS"
  | "USER_NOT_PERSISTED"
  | "PROVISIONING_RESULT_UNCERTAIN"
  | "PROVISIONING_CLEANUP_FAILED";

const DEFAULT_STATUS: Record<ProvisionUserErrorCode, number> = {
  EMAIL_ALREADY_EXISTS: 409,
  USER_NOT_PERSISTED: 500,
  PROVISIONING_RESULT_UNCERTAIN: 500,
  PROVISIONING_CLEANUP_FAILED: 500,
};

const DEFAULT_MESSAGE: Record<ProvisionUserErrorCode, string> = {
  EMAIL_ALREADY_EXISTS: "An account with this email already exists.",
  USER_NOT_PERSISTED: "The account could not be confirmed as created after sign-up.",
  PROVISIONING_RESULT_UNCERTAIN: "Could not confirm whether an account was created.",
  PROVISIONING_CLEANUP_FAILED:
    "Could not confirm that a partially created account was cleaned up.",
};

/**
 * Every provisionUser() failure mode as one error type with a fixed
 * code -> default status mapping, so call sites can write
 * `new ProvisionUserError("EMAIL_ALREADY_EXISTS")` without re-deciding
 * the HTTP status each time.
 */
export class ProvisionUserError extends ApiError {
  constructor(
    code: ProvisionUserErrorCode,
    status: number = DEFAULT_STATUS[code],
    options?: { message?: string; cause?: unknown; safeLogContext?: SafeLogContext },
  ) {
    super({
      code,
      status,
      message: options?.message ?? DEFAULT_MESSAGE[code],
      safeLogContext: options?.safeLogContext,
    });
    this.name = "ProvisionUserError";
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function isProvisionUserError(
  error: unknown,
  code?: ProvisionUserErrorCode,
): error is ProvisionUserError {
  if (!(error instanceof ProvisionUserError)) {
    return false;
  }
  return code === undefined || error.code === code;
}

import { ApiError, type SafeLogContext } from "@/lib/api/errors";

export type InvestorErrorCode = "INVESTOR_NOT_FOUND";

const DEFAULT_STATUS: Record<InvestorErrorCode, number> = {
  INVESTOR_NOT_FOUND: 404,
};

const DEFAULT_MESSAGE: Record<InvestorErrorCode, string> = {
  INVESTOR_NOT_FOUND: "Investor not found.",
};

/**
 * Investor-flow failure modes as one error type with a fixed
 * code -> default status mapping, matching InvitationError's shape so
 * both flow through withApiErrorHandling identically.
 */
export class InvestorError extends ApiError {
  constructor(
    code: InvestorErrorCode,
    status: number = DEFAULT_STATUS[code],
    options?: { message?: string; cause?: unknown; safeLogContext?: SafeLogContext },
  ) {
    super({
      code,
      status,
      message: options?.message ?? DEFAULT_MESSAGE[code],
      safeLogContext: options?.safeLogContext,
    });
    this.name = "InvestorError";
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

import { ApiError } from "@/lib/api/errors";

export type InvestorErrorCode = "INVESTOR_NOT_FOUND";

const DEFAULT_STATUS: Record<InvestorErrorCode, number> = {
  INVESTOR_NOT_FOUND: 404,
};

const DEFAULT_MESSAGE: Record<InvestorErrorCode, string> = {
  INVESTOR_NOT_FOUND: "Investor not found.",
};

/**
 * Investor-flow failure modes as one error type with a fixed
 * code -> default status mapping.
 */
export class InvestorError extends ApiError {
  constructor(
    code: InvestorErrorCode,
    status: number = DEFAULT_STATUS[code],
    options?: { message?: string; cause?: unknown },
  ) {
    super({
      code,
      status,
      message: options?.message ?? DEFAULT_MESSAGE[code],
    });
    this.name = "InvestorError";
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

import type { ApiErrorBody, ApiErrorPayload } from "@/lib/api/types";

/**
 * Fields safe to attach to a thrown ApiError for logging. Kept as a
 * closed whitelist (not a free-form Record) so nobody accidentally puts
 * email/password/tokens on an error that a log line will later dump.
 * This never reaches the HTTP response body — only withApiErrorHandling
 * reads it, to log it alongside the request id.
 */
export type SafeLogContext = {
  invitationId?: string;
  userId?: string;
  errorPhase?: string;
  outcome?: string;
};

/**
 * Superset of SafeLogContext with the request-level fields only the
 * route wrapper knows about (requestId, path, the classified error
 * shape). ApiError itself only ever carries SafeLogContext; wrapper
 * code merges the two when it writes the log line.
 */
export type SafeLoggerContext = SafeLogContext & {
  requestId?: string;
  path?: string;
  errorName?: string;
  errorCode?: string;
  status?: number;
  postgresCode?: string;
  constraint?: string;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;
  readonly safeLogContext?: SafeLogContext;

  constructor(options: {
    code: string;
    message: string;
    status: number;
    requestId?: string;
    safeLogContext?: SafeLogContext;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.safeLogContext = options.safeLogContext;
  }
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }

  const error = (value as ApiErrorBody).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  );
}

export function apiErrorFromPayload(
  payload: ApiErrorPayload,
  status: number,
): ApiError {
  return new ApiError({
    code: payload.code,
    message: payload.message,
    status,
    requestId: payload.request_id,
  });
}

export function apiErrorFromUnknown(status: number): ApiError {
  return new ApiError({
    code: "UNKNOWN_ERROR",
    message: "Unexpected API error",
    status,
  });
}

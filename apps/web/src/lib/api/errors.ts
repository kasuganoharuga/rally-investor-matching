import type { ApiErrorBody, ApiErrorPayload } from "@/lib/api/types";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;

  constructor(options: {
    code: string;
    message: string;
    status: number;
    requestId?: string;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
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

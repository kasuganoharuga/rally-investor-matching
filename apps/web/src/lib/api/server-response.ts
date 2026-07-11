import "server-only";

import { NextResponse } from "next/server";

import type { ApiErrorBody, ApiSuccessBody } from "@/lib/api/types";
import { ApiError } from "@/lib/api/errors";

export function jsonSuccess<T>(
  data: T,
  init?: ResponseInit,
): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, init);
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  requestId?: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        request_id: requestId ?? "",
      },
    },
    { status },
  );
}

export function jsonFromApiError(
  error: unknown,
  requestId?: string,
): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    return jsonError(
      error.code,
      error.message,
      error.status,
      requestId ?? error.requestId,
    );
  }

  return jsonError("INTERNAL_SERVER_ERROR", "Internal server error", 500, requestId);
}

import "server-only";

import type { NextRequest } from "next/server";
import type { z } from "zod";

import { ApiError } from "@/lib/api/errors";

/**
 * Reads and validates a JSON request body against `schema`, turning
 * both "not valid JSON" and "doesn't match the schema" into a single
 * 400 ApiError instead of letting a raw SyntaxError/ZodError reach
 * withApiErrorHandling's generic fallback (which would report 500).
 */
export async function parseJsonBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError({
      code: "INVALID_JSON_BODY",
      message: "Request body must be valid JSON.",
      status: 400,
    });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError({
      code: "INVALID_REQUEST_BODY",
      message: "Request body failed validation.",
      status: 400,
    });
  }

  return result.data;
}

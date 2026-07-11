import "server-only";

import { randomUUID } from "crypto";

import type { NextRequest } from "next/server";

import { ApiError, type SafeLoggerContext } from "@/lib/api/errors";
import { jsonFromApiError } from "@/lib/api/server-response";
import { isPostgresError } from "@/lib/server/db";
import { logger } from "@/lib/server/logger";

/**
 * Whitelist-serializes an unknown thrown value for logging. Never
 * includes `stack` or `message` from a generic Error: the first line of
 * a stack trace repeats `Error.message`, which can carry raw email/SQL
 * detail — this is a hard rule, not a NODE_ENV-gated convenience.
 */
function getSafeErrorLogContext(error: unknown): SafeLoggerContext {
  if (error instanceof ApiError) {
    return {
      errorName: error.name,
      errorCode: error.code,
      status: error.status,
      ...error.safeLogContext,
    };
  }
  if (isPostgresError(error)) {
    return {
      errorName: "PostgresError",
      postgresCode: error.code,
      constraint: error.constraint,
    };
  }
  if (error instanceof Error) {
    return { errorName: error.name };
  }
  return { errorName: "UnknownError" };
}

/**
 * Wraps a Route Handler with centralized try/catch, request-id
 * generation, and a single structured log line per failure. The
 * request id returned to the client always matches the one in the log
 * line, so `error.safeLogContext` (e.g. invitationId) can be correlated
 * back from a support report.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (request: NextRequest, ...args: Args) => Promise<Response>,
) {
  return async (request: NextRequest, ...args: Args): Promise<Response> => {
    const requestId = randomUUID();
    try {
      return await handler(request, ...args);
    } catch (error) {
      // Authoritative fields (requestId, path) go last so a stray key in
      // getSafeErrorLogContext(error) can never shadow the real values.
      logger.error("api_request_failed", {
        ...getSafeErrorLogContext(error),
        requestId,
        path: request.nextUrl.pathname,
      });
      return jsonFromApiError(error, requestId);
    }
  };
}

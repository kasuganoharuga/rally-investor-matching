import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { getPool, type Queryable } from "@/lib/server/db";

export function assertRegistrationOrigin(request: NextRequest): void {
  const configuredUrl = process.env.APP_BASE_URL ?? process.env.BETTER_AUTH_URL;
  const expectedOrigin = new URL(configuredUrl ?? request.url).origin;
  if (request.headers.get("origin") !== expectedOrigin) {
    throw new ApiError({
      code: "FORBIDDEN",
      message: "Register from the Rally website.",
      status: 403,
    });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new ApiError({
      code: "INVALID_REQUEST_BODY",
      message: "JSON is required.",
      status: 400,
    });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 16_384) {
    throw new ApiError({
      code: "INVALID_REQUEST_BODY",
      message: "Request is too large.",
      status: 413,
    });
  }
}

/** Enable only when Next is loopback-bound behind a proxy that replaces X-Real-IP. */
export function registrationClientIp(request: NextRequest): string {
  if (process.env.TRUST_PROXY !== "true") return "unknown";
  const candidate = request.headers.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate : "unknown";
}

/** Shared DB buckets survive restarts; no raw IPs/emails are retained or logged. */
export async function checkRegistrationRateLimit(
  request: NextRequest,
  email: string,
  client: Queryable = getPool(),
): Promise<void> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not configured");
  const ip = registrationClientIp(request);
  // Check IP first so a blocked caller cannot allocate unlimited email buckets.
  // Then check email before global; denied attempts never drain shared capacity.
  const limits: [string, number][] = [
    [`ip:${ip}`, 10],
    [`email:${email}`, 3],
    ["global", 100],
  ];
  await client.query(
    "DELETE FROM registration_rate_limits WHERE window_start < now() - interval '2 hours'",
  );
  for (const [identity, limit] of limits) {
    const key = createHmac("sha256", secret).update(identity).digest("hex");
    const result = await client.query<{ attempts: number }>(
      `INSERT INTO registration_rate_limits (bucket_key, window_start, attempts)
       VALUES ($1, date_trunc('hour', now()), 1)
       ON CONFLICT (bucket_key, window_start) DO UPDATE
       SET attempts = registration_rate_limits.attempts + 1
       WHERE registration_rate_limits.attempts < $2
       RETURNING attempts`,
      [key, limit],
    );
    // The conditional upsert is atomic and saturates each bucket at its limit.
    // A denied bucket does not increase or advance to later buckets. Email denial
    // may consume an IP attempt, but neither denial consumes global capacity.
    if (result.rows.length === 0) {
      throw new ApiError({
        code: "RATE_LIMITED",
        message: "Too many registration attempts. Please try again in an hour.",
        status: 429,
      });
    }
  }
}

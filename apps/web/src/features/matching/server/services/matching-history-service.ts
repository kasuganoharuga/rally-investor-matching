import "server-only";

import { randomUUID } from "crypto";

import type { CurrentUser } from "@/features/auth/server/session";
import { matchingSettingsService } from "@/features/matching/server/services/matching-settings-service";
import { resolveMatchingConfiguration } from "@/features/matching/types/matching-settings";
import {
  intakeResponseSchema,
  matchResultSchema,
  type IntakeRequest,
  type IntakeResponse,
  type MatchHistoryListData,
  type MatchRecord,
  type RunMatchData,
} from "@/features/matching/types/match";
import {
  getMatchingRunForUser,
  insertFailedMatchingRun,
  insertMatchingRun,
  listMatchingRunsForUser,
} from "@/features/matching/server/repositories/matching-history-repository";
import { ApiError, isApiErrorBody } from "@/lib/api/errors";
import { logger } from "@/lib/server/logger";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MATCHING_API_BASE_URL =
  process.env.MATCHING_API_BASE_URL ??
  process.env.NEXT_PUBLIC_MATCHING_API_BASE_URL ??
  "http://localhost:8000";

// Bounded below nginx's proxy_read_timeout (150s, see
// scripts/aws/configure-https.sh) so a stalled API surfaces as this
// service's own JSON error rather than a bodyless 504 from the proxy.
// FastAPI's own ceiling is two LLM calls at LLM_TIMEOUT_SECONDS each plus
// scoring, so anything past this is genuinely stuck, not merely slow.
const MATCHING_FETCH_TIMEOUT_MS = 140_000;

function isDataEnvelope(value: unknown): value is { data: unknown } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isTimeoutError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

/**
 * Validates a successful upstream match payload without throwing away a run
 * that FastAPI already computed.
 *
 * A single malformed match entry — an unexpected `evidence` shape, a missing
 * `investor_name`, a capacity estimate that doesn't fit — used to fail the
 * whole `intakeResponseSchema.parse()` and reach the user as a generic 500,
 * discarding every other match in the same response. Bad entries are dropped
 * individually instead; only a response whose top level is unusable fails.
 */
// Sub-objects a match can lose without becoming useless. Each is optional in
// matchResultSchema, so a match that only fails inside one of them is still a
// perfectly good ranked result — dropping the whole entry over a malformed
// capacity estimate would throw away the investor the founder came for.
const DISPOSABLE_MATCH_FIELDS = [
  "capacity_estimate",
  "investor_profile",
  "match_context",
  "eligibility",
  "evidence",
] as const;

function salvageMatch(match: unknown): unknown | null {
  if (matchResultSchema.safeParse(match).success) {
    return match;
  }
  if (typeof match !== "object" || match === null) {
    return null;
  }
  // Peel off optional sub-objects one at a time, cheapest to lose first, and
  // keep the entry as soon as the rest of it validates.
  const candidate: Record<string, unknown> = {
    ...(match as Record<string, unknown>),
  };
  for (const field of DISPOSABLE_MATCH_FIELDS) {
    if (!(field in candidate)) {
      continue;
    }
    delete candidate[field];
    if (matchResultSchema.safeParse(candidate).success) {
      return candidate;
    }
  }
  return null;
}

function parseIntakeResponse(data: unknown, requestId: string): IntakeResponse {
  const direct = intakeResponseSchema.safeParse(data);
  if (direct.success) {
    return direct.data;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { matches?: unknown }).matches)
  ) {
    const rawMatches = (data as { matches: unknown[] }).matches;
    const kept = rawMatches.map(salvageMatch).filter((match) => match !== null);
    // Salvaging every entry down to nothing is not a successful empty run —
    // that would show the founder "no investors matched" when the API in fact
    // returned matches we simply could not read. Fall through to the error.
    const everythingDropped = rawMatches.length > 0 && kept.length === 0;
    const salvaged = everythingDropped
      ? null
      : intakeResponseSchema.safeParse({ ...data, matches: kept });
    if (salvaged?.success) {
      logger.error("matching_response_partially_invalid", {
        requestId,
        matchCount: kept.length,
        droppedCount: rawMatches.length - kept.length,
        errorClass: "invalid_match_entries",
      });
      return salvaged.data;
    }
  }

  logger.error("matching_response_invalid", {
    requestId,
    errorClass: direct.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "<root>"}:${issue.code}`)
      .join(","),
  });
  throw new ApiError({
    code: "MATCHING_RESPONSE_INVALID",
    message: "Unable to read the investor matching result.",
    status: 502,
    requestId,
  });
}

function classifyUpstreamFailure(status: number, body: unknown): string {
  if (isApiErrorBody(body)) {
    return `upstream_status=${status} code=${body.error.code}`;
  }
  if (status >= 500) {
    return `upstream_status=${status} error_class=server_error`;
  }
  if (status === 401 || status === 403) {
    return `upstream_status=${status} error_class=auth`;
  }
  if (status === 429) {
    return `upstream_status=${status} error_class=rate_limit`;
  }
  return `upstream_status=${status} error_class=request_failed`;
}

export class MatchingHistoryService {
  constructor(
    private readonly dependencies: {
      settings?: Pick<typeof matchingSettingsService, "getForUser">;
      fetch?: typeof globalThis.fetch;
      insertRun?: typeof insertMatchingRun;
      insertFailedRun?: typeof insertFailedMatchingRun;
    } = {},
  ) {}

  async runIntake(request: IntakeRequest, user: CurrentUser): Promise<RunMatchData> {
    const matchingKey = process.env.RALLY_MATCHING_API_SECRET;
    if (!matchingKey) {
      throw new ApiError({
        code: "MATCHING_NOT_CONFIGURED",
        message: "Investor matching is not configured. Please contact support.",
        status: 503,
      });
    }
    const requestId = randomUUID();
    const startedAt = Date.now();
    const settings = await (
      this.dependencies.settings ?? matchingSettingsService
    ).getForUser(user);
    // Never trust a browser-supplied score, role or a historical run's settings.
    // New matches use the latest published global or saved personal weights.
    // Staff retain their existing per-match result limit and eligibility options.
    const effectiveRequest = {
      ...request,
      matching_configuration: resolveMatchingConfiguration(
        user.role,
        settings.configuration,
        request.matching_configuration,
      ),
    };

    let response: Response;
    try {
      response = await (this.dependencies.fetch ?? fetch)(
        `${MATCHING_API_BASE_URL}/api/v1/match/intake`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Rally-Matching-Key": matchingKey,
            "X-Request-ID": requestId,
          },
          body: JSON.stringify({
            message: effectiveRequest.message,
            follow_up_answer: effectiveRequest.follow_up_answer,
            follow_up_count: effectiveRequest.follow_up_count,
            matching_configuration: effectiveRequest.matching_configuration,
          }),
          cache: "no-store",
          // Without this the request inherits Node's effectively unbounded
          // socket timeout: a wedged API call would hold this handler (and
          // the user's tab) until the proxy killed it with no usable error.
          signal: AbortSignal.timeout(MATCHING_FETCH_TIMEOUT_MS),
        },
      );
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const errorClass = isTimeoutError(error)
        ? "upstream_timeout"
        : "upstream_unreachable";
      await this.recordFailure({
        userId: user.id,
        request: effectiveRequest,
        requestId,
        errorMessage: errorClass,
        upstreamStatus: null,
        latencyMs,
        errorClass,
      });
      throw new ApiError({
        code: "MATCHING_API_FAILED",
        message:
          errorClass === "upstream_timeout"
            ? "Investor matching took too long to respond. Please try again."
            : "Unable to run investor matching.",
        status: errorClass === "upstream_timeout" ? 504 : 502,
        requestId,
        safeLogContext: {
          userId: user.id,
          latencyMs,
          errorClass,
          followUpCount: effectiveRequest.follow_up_count ?? 0,
        },
      });
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    const latencyMs = Date.now() - startedAt;
    if (!response.ok || !isDataEnvelope(body)) {
      const errorMessage = classifyUpstreamFailure(response.status, body);
      const upstreamRequestId =
        typeof response.headers.get("x-request-id") === "string"
          ? response.headers.get("x-request-id")
          : null;
      await this.recordFailure({
        userId: user.id,
        request: effectiveRequest,
        requestId,
        errorMessage:
          upstreamRequestId && upstreamRequestId !== requestId
            ? `${errorMessage} upstream_request_id=${upstreamRequestId}`
            : errorMessage,
        upstreamStatus: response.status,
        latencyMs,
        errorClass: "MATCHING_API_FAILED",
      });
      throw new ApiError({
        code: "MATCHING_API_FAILED",
        message: "Unable to run investor matching.",
        status: response.ok ? 502 : response.status,
        requestId,
        safeLogContext: {
          userId: user.id,
          upstreamStatus: response.status,
          latencyMs,
          errorClass: "MATCHING_API_FAILED",
          followUpCount: effectiveRequest.follow_up_count ?? 0,
        },
      });
    }

    const parsedResponse = parseIntakeResponse(body.data, requestId);
    const record = await (this.dependencies.insertRun ?? insertMatchingRun)({
      userId: user.id,
      request: effectiveRequest,
      response: parsedResponse,
    });

    logger.info("matching_intake_completed", {
      requestId,
      userId: user.id,
      latencyMs,
      matchCount: parsedResponse.matches.length,
      outcome: parsedResponse.status,
      followUpCount: parsedResponse.follow_up_count,
    });

    return { response: parsedResponse, record };
  }

  private async recordFailure(input: {
    userId: string;
    request: IntakeRequest;
    requestId: string;
    errorMessage: string;
    upstreamStatus: number | null;
    latencyMs: number;
    errorClass: string;
  }): Promise<void> {
    logger.error("matching_intake_failed", {
      requestId: input.requestId,
      userId: input.userId,
      upstreamStatus: input.upstreamStatus ?? undefined,
      latencyMs: input.latencyMs,
      errorClass: input.errorClass,
      followUpCount: input.request.follow_up_count ?? 0,
    });
    try {
      await (this.dependencies.insertFailedRun ?? insertFailedMatchingRun)({
        userId: input.userId,
        request: input.request,
        requestId: input.requestId,
        errorMessage: input.errorMessage,
        upstreamStatus: input.upstreamStatus,
        latencyMs: input.latencyMs,
      });
    } catch {
      logger.error("matching_failed_run_persist_failed", {
        requestId: input.requestId,
        userId: input.userId,
        errorClass: "persist_failed",
      });
    }
  }

  async listHistory(user: CurrentUser): Promise<MatchHistoryListData> {
    return {
      items: await listMatchingRunsForUser(user.id),
    };
  }

  async getRun(runId: string, user: CurrentUser): Promise<MatchRecord> {
    if (!UUID_PATTERN.test(runId)) {
      throw new ApiError({
        code: "MATCHING_RUN_NOT_FOUND",
        status: 404,
        message: "This match could not be found.",
      });
    }

    const record = await getMatchingRunForUser(user.id, runId);
    if (!record) {
      throw new ApiError({
        code: "MATCHING_RUN_NOT_FOUND",
        status: 404,
        message: "This match could not be found.",
      });
    }

    return record;
  }
}

export const matchingHistoryService = new MatchingHistoryService();

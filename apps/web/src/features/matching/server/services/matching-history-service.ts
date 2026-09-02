import "server-only";

import type { CurrentUser } from "@/features/auth/server/session";
import { matchingSettingsService } from "@/features/matching/server/services/matching-settings-service";
import { resolveMatchingConfiguration } from "@/features/matching/types/matching-settings";
import {
  intakeResponseSchema,
  type IntakeRequest,
  type MatchHistoryListData,
  type MatchRecord,
  type RunMatchData,
} from "@/features/matching/types/match";
import {
  getMatchingRunForUser,
  insertMatchingRun,
  listMatchingRunsForUser,
} from "@/features/matching/server/repositories/matching-history-repository";
import { ApiError } from "@/lib/api/errors";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MATCHING_API_BASE_URL =
  process.env.MATCHING_API_BASE_URL ??
  process.env.NEXT_PUBLIC_MATCHING_API_BASE_URL ??
  "http://localhost:8000";

function isDataEnvelope(value: unknown): value is { data: unknown } {
  return typeof value === "object" && value !== null && "data" in value;
}

export class MatchingHistoryService {
  constructor(
    private readonly dependencies: {
      settings?: Pick<typeof matchingSettingsService, "getForUser">;
      fetch?: typeof globalThis.fetch;
      insertRun?: typeof insertMatchingRun;
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
    const response = await (this.dependencies.fetch ?? fetch)(
      `${MATCHING_API_BASE_URL}/api/v1/match/intake`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Rally-Matching-Key": matchingKey,
        },
        body: JSON.stringify({
          message: effectiveRequest.message,
          follow_up_answer: effectiveRequest.follow_up_answer,
          follow_up_count: effectiveRequest.follow_up_count,
          matching_configuration: effectiveRequest.matching_configuration,
        }),
        cache: "no-store",
      },
    );

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok || !isDataEnvelope(body)) {
      throw new ApiError({
        code: "MATCHING_API_FAILED",
        message: "Unable to run investor matching.",
        status: response.ok ? 502 : response.status,
      });
    }

    const parsedResponse = intakeResponseSchema.parse(body.data);
    const record = await (this.dependencies.insertRun ?? insertMatchingRun)({
      userId: user.id,
      request: effectiveRequest,
      response: parsedResponse,
    });

    return { response: parsedResponse, record };
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

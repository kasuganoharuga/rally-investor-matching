import "server-only";

import { canConfigureMatching } from "@/features/auth/role-policy";
import type { CurrentUser } from "@/features/auth/server/session";
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
  async runIntake(request: IntakeRequest, user: CurrentUser): Promise<RunMatchData> {
    const effectiveRequest = canConfigureMatching(user.role)
      ? request
      : { ...request, matching_configuration: undefined };
    const response = await fetch(`${MATCHING_API_BASE_URL}/api/v1/match/intake`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: effectiveRequest.message,
        follow_up_answer: effectiveRequest.follow_up_answer,
        follow_up_count: effectiveRequest.follow_up_count,
        matching_configuration: effectiveRequest.matching_configuration,
      }),
      cache: "no-store",
    });

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
    const record = await insertMatchingRun({
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

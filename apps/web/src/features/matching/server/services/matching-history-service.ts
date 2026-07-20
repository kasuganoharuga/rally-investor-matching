import "server-only";

import type { CurrentUser } from "@/features/auth/server/session";
import {
  intakeResponseSchema,
  type IntakeRequest,
  type MatchHistoryListData,
  type RunMatchData,
} from "@/features/matching/types/match";
import {
  insertMatchingRun,
  listMatchingRunsForUser,
} from "@/features/matching/server/repositories/matching-history-repository";
import { ApiError } from "@/lib/api/errors";

const MATCHING_API_BASE_URL =
  process.env.MATCHING_API_BASE_URL ??
  process.env.NEXT_PUBLIC_MATCHING_API_BASE_URL ??
  "http://localhost:8000";

function isDataEnvelope(value: unknown): value is { data: unknown } {
  return typeof value === "object" && value !== null && "data" in value;
}

export class MatchingHistoryService {
  async runIntake(
    request: IntakeRequest,
    user: CurrentUser,
  ): Promise<RunMatchData> {
    const response = await fetch(`${MATCHING_API_BASE_URL}/api/v1/match/intake`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
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
      request,
      response: parsedResponse,
    });

    return { response: parsedResponse, record };
  }

  async listHistory(user: CurrentUser): Promise<MatchHistoryListData> {
    return {
      items: await listMatchingRunsForUser(user.id),
    };
  }
}

export const matchingHistoryService = new MatchingHistoryService();

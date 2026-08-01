import "server-only";

import {
  intakeResponseSchema,
  type IntakeRequest,
  type IntakeResponse,
  type MatchRecord,
} from "@/features/matching/types/match";
import { getPool, type Queryable } from "@/lib/server/db";

const HISTORY_LIMIT = 25;
const KNOWN_FUNDING_STAGES = new Set([
  "pre_seed",
  "seed",
  "series_a",
  "series_b",
  "series_c_plus",
  "growth",
  "bridge",
  "unknown",
]);

type MatchingRunRow = {
  id: string;
  created_at: Date;
  founder_profile_snapshot: unknown;
};

function normalizeFundingStage(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
  if (normalized === "preseed") {
    return "pre_seed";
  }
  if (
    normalized === "series_c" ||
    normalized === "series_d" ||
    normalized === "series_e"
  ) {
    return "series_c_plus";
  }
  return KNOWN_FUNDING_STAGES.has(normalized) ? normalized : "unknown";
}

function stringValues(...values: unknown[]): string[] {
  const collected = new Set<string>();
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          collected.add(item.trim());
        }
      }
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      collected.add(value.trim());
    }
  }
  return [...collected];
}

function snapshotFromResponse(
  request: IntakeRequest,
  response: IntakeResponse,
): Record<string, unknown> {
  return {
    parsed_company_profile: response.parsed_company_profile,
    missing_fields: response.missing_fields,
    follow_up_count: response.follow_up_count,
    request_summary: {
      follow_up_count: request.follow_up_count ?? 0,
      has_follow_up_answer: Boolean(request.follow_up_answer?.trim()),
      matching_configuration: request.matching_configuration ?? null,
    },
    response,
  };
}

function mapRow(row: MatchingRunRow): MatchRecord | null {
  const snapshot = row.founder_profile_snapshot;
  if (typeof snapshot !== "object" || snapshot === null || !("response" in snapshot)) {
    return null;
  }

  const parsed = intakeResponseSchema.safeParse(
    (snapshot as { response?: unknown }).response,
  );
  if (!parsed.success) {
    return null;
  }

  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    response: parsed.data,
  };
}

export async function insertMatchingRun(
  input: {
    userId: string;
    request: IntakeRequest;
    response: IntakeResponse;
  },
  client: Queryable = getPool(),
): Promise<MatchRecord | null> {
  if (input.response.matches.length === 0) {
    return null;
  }

  const profile = input.response.parsed_company_profile;
  const targetStage = normalizeFundingStage(profile.stage);
  const targetGeographies = stringValues(
    profile.company_hq_country,
    profile.primary_market,
    profile.target_geographies,
  );
  const snapshot = snapshotFromResponse(input.request, input.response);

  const result = await client.query(
    `INSERT INTO matching_runs (
       user_id,
       matching_mode,
       founder_profile_snapshot,
       target_stage,
       target_geographies,
       target_filters,
       algorithm_version,
       scoring_version,
       prompt_version,
       status,
       result_count,
       started_at,
       completed_at
     )
     VALUES (
       $1,
       'standard',
       $2::jsonb,
       $3::funding_stage,
       $4::jsonb,
       $5::jsonb,
       'mvp-fastapi-proxy',
       'mvp-scoring-v1',
       'founder-parser-v1',
       'completed',
       $6,
       now(),
       now()
     )
     RETURNING id, created_at, founder_profile_snapshot`,
    [
      input.userId,
      JSON.stringify(snapshot),
      targetStage,
      JSON.stringify(targetGeographies),
      JSON.stringify({
        source: "web_match_proxy",
        stored_recommendations: "response_snapshot",
        matching_configuration: input.request.matching_configuration ?? null,
      }),
      input.response.matches.length,
    ],
  );

  return mapRow(result.rows[0] as MatchingRunRow);
}

export async function getMatchingRunForUser(
  userId: string,
  runId: string,
  client: Queryable = getPool(),
): Promise<MatchRecord | null> {
  const result = await client.query(
    `SELECT id, created_at, founder_profile_snapshot
     FROM matching_runs
     WHERE id = $1
       AND user_id = $2
       AND deleted_at IS NULL
       AND status = 'completed'`,
    [runId, userId],
  );

  const row = result.rows[0] as MatchingRunRow | undefined;
  return row ? mapRow(row) : null;
}

export async function listMatchingRunsForUser(
  userId: string,
  client: Queryable = getPool(),
): Promise<MatchRecord[]> {
  const result = await client.query(
    `SELECT id, created_at, founder_profile_snapshot
     FROM matching_runs
     WHERE user_id = $1
       AND deleted_at IS NULL
       AND status = 'completed'
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, HISTORY_LIMIT],
  );

  return (result.rows as MatchingRunRow[])
    .map(mapRow)
    .filter((record): record is MatchRecord => record !== null);
}

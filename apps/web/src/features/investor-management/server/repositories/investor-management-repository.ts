import "server-only";

import type {
  InvestorReviewStatus,
  ManagedInvestor,
} from "@/features/investor-management/types/investor-management";
import { getPool, type Queryable } from "@/lib/server/db";

const MANAGED_INVESTOR_SELECT = `
  WITH stage_rollup AS (
    SELECT
      preference.investor_id,
      jsonb_agg(
        jsonb_build_object(
          'stage', preference.stage::text,
          'dealsCount', preference.deals_count,
          'leadCount', preference.lead_count,
          'participantCount', preference.participant_count,
          'chequeSizeMinUsd', preference.cheque_size_min_usd,
          'chequeSizeMaxUsd', preference.cheque_size_max_usd,
          'sectors', preference.actual_sector,
          'themes', preference.actual_themes,
          'dataQuality', preference.data_quality::text
        ) ORDER BY preference.deals_count DESC, preference.stage::text
      ) AS stages
    FROM investor_actual_stage_preferences preference
    WHERE preference.deleted_at IS NULL
    GROUP BY preference.investor_id
  ),
  deal_stats AS (
    SELECT investor_id, COUNT(*)::int AS deal_count
    FROM deal_investors
    WHERE deleted_at IS NULL AND investor_id IS NOT NULL
    GROUP BY investor_id
  ),
  team_stats AS (
    SELECT investor_id, COUNT(*)::int AS team_member_count
    FROM investor_team_members
    WHERE deleted_at IS NULL AND is_active
    GROUP BY investor_id
  ),
  review_stats AS (
    SELECT investor_id, COUNT(*)::int AS review_history_count
    FROM preference_review_history
    WHERE deleted_at IS NULL
    GROUP BY investor_id
  )
  SELECT
    investor.id,
    investor.canonical_name,
    lower(regexp_replace(regexp_replace(investor.canonical_name,
      '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) AS slug,
    investor.investor_type::text AS investor_type,
    investor.website_url,
    investor.linkedin_url,
    investor.hq_country,
    investor.hq_state,
    investor.hq_city,
    investor.status,
    investor.review_status::text AS review_status,
    investor.last_reviewed_at,
    reviewer.name AS reviewer_name,
    preference.data_quality::text AS data_quality,
    preference.overall_confidence,
    COALESCE(preference.total_deals_found, 0)::int AS total_deals_found,
    COALESCE(preference.total_deals_used, 0)::int AS total_deals_used,
    preference.activity_summary,
    preference.generated_at,
    web_profile.claimed_thesis,
    COALESCE(web_profile.source_count, 0)::int AS source_count,
    COALESCE(deal_stats.deal_count, 0)::int AS deal_count,
    COALESCE(team_stats.team_member_count, 0)::int AS team_member_count,
    COALESCE(review_stats.review_history_count, 0)::int AS review_history_count,
    COALESCE(stage_rollup.stages, '[]'::jsonb) AS stages,
    investor.updated_at
  FROM investors investor
  LEFT JOIN "user" reviewer ON reviewer.id = investor.last_reviewed_by
  LEFT JOIN investor_actual_preferences preference
    ON preference.investor_id = investor.id
  LEFT JOIN stage_rollup ON stage_rollup.investor_id = investor.id
  LEFT JOIN deal_stats ON deal_stats.investor_id = investor.id
  LEFT JOIN team_stats ON team_stats.investor_id = investor.id
  LEFT JOIN review_stats ON review_stats.investor_id = investor.id
  LEFT JOIN LATERAL (
    SELECT
      profile.claimed_thesis,
      CASE
        WHEN jsonb_typeof(profile.source_urls) = 'array'
          THEN jsonb_array_length(profile.source_urls)
        ELSE 0
      END AS source_count
    FROM investor_web_profiles profile
    WHERE profile.investor_id = investor.id
      AND profile.deleted_at IS NULL
      AND profile.is_current
    ORDER BY profile.created_at DESC
    LIMIT 1
  ) web_profile ON true
`;

type ManagedInvestorRow = {
  id: string;
  canonical_name: string;
  slug: string;
  investor_type: string;
  website_url: string | null;
  linkedin_url: string | null;
  hq_country: string | null;
  hq_state: string | null;
  hq_city: string | null;
  status: string;
  review_status: InvestorReviewStatus;
  last_reviewed_at: Date | null;
  reviewer_name: string | null;
  data_quality: string | null;
  overall_confidence: string | number | null;
  total_deals_found: number;
  total_deals_used: number;
  activity_summary: string | null;
  generated_at: Date | null;
  claimed_thesis: string | null;
  source_count: number;
  deal_count: number;
  team_member_count: number;
  review_history_count: number;
  stages: ManagedInvestor["stages"];
  updated_at: Date;
};

function nullableNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapRow(row: ManagedInvestorRow): ManagedInvestor {
  return {
    id: row.id,
    name: row.canonical_name,
    slug: row.slug,
    investorType: row.investor_type,
    websiteUrl: row.website_url,
    linkedinUrl: row.linkedin_url,
    hqCountry: row.hq_country,
    hqState: row.hq_state,
    hqCity: row.hq_city,
    status: row.status,
    reviewStatus: row.review_status,
    lastReviewedAt: row.last_reviewed_at?.toISOString() ?? null,
    reviewerName: row.reviewer_name,
    dataQuality: row.data_quality,
    overallConfidence: nullableNumber(row.overall_confidence),
    totalDealsFound: row.total_deals_found,
    totalDealsUsed: row.total_deals_used,
    activitySummary: row.activity_summary,
    generatedAt: row.generated_at?.toISOString() ?? null,
    claimedThesis: row.claimed_thesis,
    sourceCount: row.source_count,
    dealCount: row.deal_count,
    teamMemberCount: row.team_member_count,
    reviewHistoryCount: row.review_history_count,
    stages: row.stages,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listInvestors(
  client: Queryable = getPool(),
): Promise<ManagedInvestor[]> {
  const result = await client.query(
    `${MANAGED_INVESTOR_SELECT}
     WHERE investor.deleted_at IS NULL
     ORDER BY investor.updated_at DESC, lower(investor.canonical_name)`,
  );
  return (result.rows as ManagedInvestorRow[]).map(mapRow);
}

export async function findInvestorById(
  id: string,
  client: Queryable = getPool(),
): Promise<ManagedInvestor | null> {
  const result = await client.query(
    `${MANAGED_INVESTOR_SELECT}
     WHERE investor.id = $1 AND investor.deleted_at IS NULL`,
    [id],
  );
  const row = result.rows[0] as ManagedInvestorRow | undefined;
  return row ? mapRow(row) : null;
}

export async function updateReviewStatus(
  id: string,
  reviewStatus: "approved" | "needs_more_data" | "rejected",
  reviewerId: string,
  client: Queryable,
): Promise<boolean> {
  const result = await client.query(
    `UPDATE investors
     SET review_status = $2::review_status,
         last_reviewed_at = now(),
         last_reviewed_by = $3,
         updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL`,
    [id, reviewStatus, reviewerId],
  );
  return result.rowCount === 1;
}

export async function recordReview(
  investorId: string,
  reviewerId: string,
  previousStatus: InvestorReviewStatus,
  nextStatus: "approved" | "needs_more_data" | "rejected",
  note: string | null,
  client: Queryable,
): Promise<void> {
  const action =
    nextStatus === "needs_more_data" ? "flagged_needs_more_data" : nextStatus;
  await client.query(
    `INSERT INTO preference_review_history (
       investor_id, reviewer_id, action, old_value, new_value, notes
     ) VALUES ($1, $2, $3::review_action, $4::jsonb, $5::jsonb, $6)`,
    [
      investorId,
      reviewerId,
      action,
      JSON.stringify({ review_status: previousStatus }),
      JSON.stringify({ review_status: nextStatus }),
      note,
    ],
  );
}

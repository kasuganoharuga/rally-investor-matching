from typing import Any

from psycopg import Connection
from psycopg.rows import dict_row

from app.schemas.investor import InvestorDetail, InvestorSummary

SLUG_SQL = (
    "lower(regexp_replace(regexp_replace(i.canonical_name, "
    "'[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))"
)

FORMAL_INVESTOR_SELECT = f"""
WITH stage_rows AS (
  SELECT
    sp.investor_id,
    sp.stage::text AS stage,
    sp.deals_count,
    sp.deals_window_start,
    sp.deals_window_end,
    sp.lead_count,
    sp.participant_count,
    sp.leads_at_this_stage,
    sp.cheque_size_min_usd,
    sp.cheque_size_max_usd,
    sp.cheque_size_confidence::text AS cheque_size_confidence,
    sp.recent_activity_score,
    sp.actual_sector,
    sp.actual_themes,
    sp.dimension_distributions,
    sp.actual_archetypes,
    sp.matching_notes,
    sp.evidence_refs,
    sp.data_quality::text AS data_quality,
    sp.pipeline_version,
    sp.generated_at
  FROM public.investor_actual_stage_preferences sp
  WHERE sp.deleted_at IS NULL
),
stage_rollup AS (
  SELECT
    investor_id,
    array_agg(DISTINCT stage ORDER BY stage) AS stage_focus,
    jsonb_agg(
      to_jsonb(stage_rows) ORDER BY deals_count DESC, stage
    ) AS stage_preferences,
    jsonb_agg(
      jsonb_build_object(
        'basis', 'actual_deal_evidence',
        'stage', stage,
        'currency', 'USD',
        'amount_min', cheque_size_min_usd,
        'amount_max', cheque_size_max_usd,
        'confidence', cheque_size_confidence,
        'hard_filter_safe', false
      )
      ORDER BY stage
    ) FILTER (
      WHERE cheque_size_min_usd IS NOT NULL OR cheque_size_max_usd IS NOT NULL
    ) AS cheque_ranges
  FROM stage_rows
  GROUP BY investor_id
),
sector_rollup AS (
  SELECT
    investor_id,
    array_agg(DISTINCT sector ORDER BY sector) AS sector_focus
  FROM stage_rows, LATERAL unnest(actual_sector) AS sector
  GROUP BY investor_id
),
theme_rollup AS (
  SELECT
    investor_id,
    array_agg(DISTINCT theme ORDER BY theme) AS theme_focus
  FROM stage_rows, LATERAL unnest(actual_themes) AS theme
  GROUP BY investor_id
),
geo_rollup AS (
  SELECT
    investor_id,
    array_agg(DISTINCT geo ORDER BY geo) AS geography_focus
  FROM stage_rows,
       LATERAL jsonb_object_keys(
         COALESCE(dimension_distributions->'geography'->'weighted', '{{}}'::jsonb)
       ) AS geo
  GROUP BY investor_id
),
ai_rollup AS (
  SELECT
    investor_id,
    CASE
      WHEN bool_or(
        dimension_distributions->'ai_relevance'->'weighted' ? 'ai_native'
        OR dimension_distributions->'ai_relevance'->'weighted' ? 'ai_infrastructure'
      ) THEN 'high'
      WHEN bool_or(
        dimension_distributions->'ai_relevance'->'weighted' ? 'ai_enabled'
      ) THEN 'medium'
      ELSE 'low'
    END AS ai_appetite
  FROM stage_rows
  GROUP BY investor_id
),
deal_rollup AS (
  SELECT
    di.investor_id,
    jsonb_agg(
      jsonb_build_object(
        'company', c.name,
        'round', fr.round_stage::text,
        'amount_text', fr.money_raised_raw,
        'amount_currency', fr.currency,
        'amount_value', fr.amount_usd,
        'role', di.role::text,
        'date', fr.announced_date,
        'direction', c.use_case_primary,
        'actual_sector', c.sector_primary,
        'sector_secondary', c.sector_secondary,
        'use_case_primary', c.use_case_primary,
        'use_case_secondary', c.use_case_secondary,
        'customer_type', c.customer_type::text,
        'business_model', c.business_model::text,
        'sales_motion', c.sales_motion::text,
        'technology_depth', c.technology_depth::text,
        'ai_relevance', c.ai_relevance::text,
        'ai_usage_type', c.ai_usage_type::text,
        'company_summary', c.company_summary,
        'confidence', c.confidence::text,
        'source_urls', c.source_urls,
        'company_geography',
          CASE WHEN c.is_anz THEN 'ANZ' ELSE COALESCE(c.hq_country, '') END,
        'investor_evidence_url', fr.source_url
      )
      ORDER BY fr.announced_date DESC NULLS LAST
    ) AS recent_deals
  FROM public.deal_investors di
  JOIN public.funding_rounds fr
    ON fr.id = di.deal_id
   AND fr.deleted_at IS NULL
  LEFT JOIN public.investee_company_profiles c
    ON c.id = fr.investee_company_id
   AND c.deleted_at IS NULL
  WHERE di.deleted_at IS NULL
  GROUP BY di.investor_id
)
SELECT
  i.id,
  i.canonical_name AS name,
  {SLUG_SQL} AS slug,
  i.investor_type::text AS investor_type,
  i.website_url,
  i.linkedin_url,
  NULL::int AS founded_year,
  i.hq_country,
  i.hq_state,
  i.hq_city,
  COALESCE(sr.stage_focus, ARRAY[]::text[]) AS stage_focus,
  COALESCE(sec.sector_focus, ARRAY[]::text[]) AS sector_focus,
  COALESCE(
    geo.geography_focus,
    CASE
      WHEN i.hq_country IS NOT NULL AND i.hq_country <> '' THEN ARRAY[i.hq_country]
      ELSE ARRAY[]::text[]
    END
  ) AS geography_focus,
  COALESCE(th.theme_focus, ARRAY[]::text[]) AS business_model_focus,
  ARRAY[]::text[] AS founder_fit,
  COALESCE(sr.cheque_ranges, '[]'::jsonb) AS cheque_ranges,
  CASE
    WHEN ap.lead_ratio >= 0.5 THEN 'lead'
    WHEN ap.lead_ratio > 0 THEN 'leads_and_follows'
    WHEN ap.total_deals_used > 0 THEN 'participant'
    ELSE 'unknown'
  END AS lead_behavior,
  COALESCE(ai.ai_appetite, 'low') AS ai_appetite,
  COALESCE(dr.recent_deals, '[]'::jsonb) AS recent_deals,
  ARRAY[]::text[] AS entry_channels,
  NULL::text AS preferred_channel,
  i.review_status::text AS screening_status,
  ap.data_quality::text AS screening_priority,
  COALESCE(
    ap.activity_summary,
    'No observed preference rollup yet.'
  ) AS screening_notes,
  COALESCE(sr.stage_preferences, '[]'::jsonb) AS stage_preferences,
  COALESCE(ap.total_deals_used, 0) AS total_deals_used,
  COALESCE(ap.stage_coverage, '{{}}'::jsonb) AS stage_coverage,
  ap.lead_ratio,
  ap.overall_confidence,
  ap.activity_summary,
  ap.data_quality::text AS data_quality,
  i.created_at,
  i.updated_at
FROM public.investors i
LEFT JOIN public.investor_actual_preferences ap
  ON ap.investor_id = i.id
LEFT JOIN stage_rollup sr
  ON sr.investor_id = i.id
LEFT JOIN sector_rollup sec
  ON sec.investor_id = i.id
LEFT JOIN theme_rollup th
  ON th.investor_id = i.id
LEFT JOIN geo_rollup geo
  ON geo.investor_id = i.id
LEFT JOIN ai_rollup ai
  ON ai.investor_id = i.id
LEFT JOIN deal_rollup dr
  ON dr.investor_id = i.id
WHERE i.deleted_at IS NULL
"""


class InvestorRepository:
    def list_summaries(self, connection: Connection) -> list[InvestorSummary]:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(f"{FORMAL_INVESTOR_SELECT} ORDER BY i.canonical_name")
            return [
                InvestorSummary.model_validate(dict(row)) for row in cursor.fetchall()
            ]

    def get_detail(self, connection: Connection, slug: str) -> InvestorDetail | None:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                {FORMAL_INVESTOR_SELECT}
                  AND ({SLUG_SQL} = %s OR i.id::text = %s)
                """,
                (slug, slug),
            )
            row = cursor.fetchone()
        return InvestorDetail.model_validate(dict(row)) if row else None

    def list_match_profiles(self, connection: Connection) -> list[dict[str, Any]]:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(f"{FORMAL_INVESTOR_SELECT} ORDER BY i.canonical_name")
            return [dict(row) for row in cursor.fetchall()]


investor_repository = InvestorRepository()

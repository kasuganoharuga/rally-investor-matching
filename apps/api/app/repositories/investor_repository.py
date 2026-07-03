from typing import Any

from psycopg import Connection
from psycopg.rows import dict_row

from app.schemas.investor import InvestorDetail, InvestorSummary

INVESTOR_DETAIL_SELECT = """
SELECT
  id,
  name,
  slug,
  investor_type,
  website_url,
  linkedin_url,
  founded_year,
  hq_country,
  hq_state,
  hq_city,
  stage_focus,
  sector_focus,
  geography_focus,
  business_model_focus,
  founder_fit,
  cheque_ranges,
  lead_behavior,
  ai_appetite,
  recent_deals,
  entry_channels,
  preferred_channel,
  screening_status,
  screening_priority,
  screening_notes,
  created_at,
  updated_at
FROM investors
"""

MATCH_PROFILE_SELECT = """
SELECT
  id::text,
  name,
  slug,
  investor_type,
  website_url,
  linkedin_url,
  hq_country,
  hq_state,
  hq_city,
  stage_focus,
  sector_focus,
  geography_focus,
  business_model_focus,
  founder_fit,
  cheque_ranges,
  lead_behavior,
  ai_appetite,
  recent_deals,
  entry_channels,
  preferred_channel,
  screening_status,
  screening_priority,
  screening_notes,
  updated_at
FROM investors
ORDER BY name
"""


class InvestorRepository:
    def list_summaries(self, connection: Connection) -> list[InvestorSummary]:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                  id,
                  name,
                  slug,
                  investor_type,
                  website_url,
                  founded_year,
                  hq_country,
                  hq_state,
                  hq_city,
                  stage_focus,
                  sector_focus,
                  geography_focus,
                  business_model_focus,
                  cheque_ranges,
                  lead_behavior,
                  screening_status,
                  screening_priority,
                  screening_notes
                FROM investors
                ORDER BY name
                """
            )
            return [
                InvestorSummary.model_validate(dict(row)) for row in cursor.fetchall()
            ]

    def get_detail(self, connection: Connection, slug: str) -> InvestorDetail | None:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(f"{INVESTOR_DETAIL_SELECT} WHERE slug = %s", (slug,))
            row = cursor.fetchone()
        return InvestorDetail.model_validate(dict(row)) if row else None

    def list_match_profiles(self, connection: Connection) -> list[dict[str, Any]]:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(MATCH_PROFILE_SELECT)
            return [dict(row) for row in cursor.fetchall()]


investor_repository = InvestorRepository()

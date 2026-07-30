from typing import Any

from psycopg import Connection

from app.repositories.investor_repository import investor_repository
from app.schemas.match import IntakeRequest, IntakeResponse
from app.services.founder_parser_service import parse_founder_message
from app.services.matching_scoring import (
    build_theme_prevalence,
    database_row_to_profile,
    score_profile,
    select_ranked_matches,
)

REQUIRED_FIELDS = [
    "company_name",
    "company_hq_country",
    "primary_market",
    "stage",
    "sector",
    "business_model",
    "target_raise_value",
    "target_raise_currency",
    "target_raise_unit",
    "lead_needed",
]

FIELD_LABELS = {
    "company_name": "company name",
    "company_hq_country": "HQ country",
    "primary_market": "primary market",
    "stage": "fundraising stage",
    "sector": "sector",
    "business_model": "business model",
    "target_raise_value": "target raise amount",
    "target_raise_currency": "raise currency",
    "target_raise_unit": "raise amount unit",
    "lead_needed": "whether you need a lead investor",
}

MATCH_RESULT_LIMIT = 20


def build_match_investor_profile(row: dict[str, Any]) -> dict[str, Any]:
    entry_channels = row.get("entry_channels") or []
    updated_at = row.get("updated_at")
    return {
        "investor_type": row.get("investor_type"),
        "website_url": row.get("website_url"),
        "linkedin_url": row.get("linkedin_url"),
        "hq_country": row.get("hq_country"),
        "hq_state": row.get("hq_state"),
        "hq_city": row.get("hq_city"),
        "stage_focus": row.get("stage_focus") or [],
        "sector_focus": row.get("sector_focus") or [],
        "geography_focus": row.get("geography_focus") or [],
        "business_model_focus": row.get("business_model_focus") or [],
        "founder_fit": row.get("founder_fit") or [],
        "cheque_ranges": row.get("cheque_ranges") or [],
        "lead_behavior": row.get("lead_behavior"),
        "ai_appetite": row.get("ai_appetite"),
        "recent_deals": row.get("recent_deals") or [],
        "entry_channels": entry_channels,
        "preferred_channel": row.get("preferred_channel"),
        "warm_intro_available": any(
            channel in {"warm_intro", "event", "network"} for channel in entry_channels
        ),
        "screening_status": row.get("screening_status"),
        "screening_priority": row.get("screening_priority"),
        "screening_notes": row.get("screening_notes"),
        "stage_preferences": row.get("stage_preferences") or [],
        "total_deals_used": row.get("total_deals_used") or 0,
        "stage_coverage": row.get("stage_coverage") or {},
        "lead_ratio": row.get("lead_ratio"),
        "overall_confidence": row.get("overall_confidence"),
        "activity_summary": row.get("activity_summary"),
        "data_quality": row.get("data_quality"),
        "updated_at": (
            updated_at.isoformat() if hasattr(updated_at, "isoformat") else updated_at
        ),
    }


def has_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict)):
        return bool(value)
    return True


def missing_required_fields(profile: dict[str, Any]) -> list[str]:
    missing = [field for field in REQUIRED_FIELDS if not has_value(profile.get(field))]
    model_missing = profile.get("missing_information")
    if isinstance(model_missing, list):
        for item in model_missing:
            key = str(item).strip()
            if key in REQUIRED_FIELDS and key not in missing:
                missing.append(key)
    return missing


def build_follow_up_question(missing_fields: list[str]) -> str:
    labels = [FIELD_LABELS.get(field, field) for field in missing_fields[:4]]
    if not labels:
        return ""
    joined = ", ".join(labels)
    return (
        f"Could you also share {joined}? "
        "Then I can match you against the investor database."
    )


def combined_message(request: IntakeRequest) -> str:
    if not request.follow_up_answer:
        return request.message
    return (
        f"{request.message}\n\n"
        f"Additional founder answers after follow-up:\n{request.follow_up_answer}"
    )


class MatchService:
    def __init__(self, repository=investor_repository) -> None:
        self._repository = repository

    def intake(
        self,
        *,
        request: IntakeRequest,
        connection: Connection,
    ) -> IntakeResponse:
        founder_profile = parse_founder_message(combined_message(request))
        missing_fields = missing_required_fields(founder_profile)
        has_followed_up = request.follow_up_count >= 1 or bool(request.follow_up_answer)

        if missing_fields and not has_followed_up:
            return IntakeResponse(
                status="needs_follow_up",
                parsed_company_profile=founder_profile,
                missing_fields=missing_fields,
                follow_up_question=build_follow_up_question(missing_fields),
                follow_up_count=1,
                matches=[],
            )

        return IntakeResponse(
            status="matched_with_missing_information" if missing_fields else "matched",
            parsed_company_profile=founder_profile,
            missing_fields=missing_fields,
            follow_up_question=None,
            follow_up_count=min(
                request.follow_up_count + (1 if request.follow_up_answer else 0),
                1,
            ),
            matches=self._run_database_match(
                founder_profile=founder_profile,
                connection=connection,
                matching_weights=(
                    request.matching_configuration.weights.model_dump()
                    if request.matching_configuration
                    else None
                ),
                hard_filters=(
                    request.matching_configuration.hard_filters.model_dump()
                    if request.matching_configuration
                    else None
                ),
            ),
        )

    def _run_database_match(
        self,
        *,
        founder_profile: dict[str, Any],
        connection: Connection,
        matching_weights: dict[str, int] | None = None,
        hard_filters: dict[str, bool] | None = None,
    ) -> list[dict[str, Any]]:
        results = []
        rows = self._repository.list_match_profiles(connection)
        profiles = [database_row_to_profile(row) for row in rows]
        theme_prevalence = build_theme_prevalence(profiles)
        for row, profile in zip(rows, profiles, strict=True):
            result = score_profile(
                founder_profile,
                profile,
                theme_prevalence=theme_prevalence,
                matching_weights=matching_weights,
                hard_filters=hard_filters,
            )
            if not result.get("eligibility", {}).get("passed", True):
                continue
            result["investor_profile"] = build_match_investor_profile(row)
            results.append(result)

        return select_ranked_matches(results, limit=MATCH_RESULT_LIMIT)


match_service = MatchService()

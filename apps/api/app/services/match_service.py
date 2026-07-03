from typing import Any

from psycopg import Connection
from vc_match_intelligence.founder_parser import parse_founder_message
from vc_match_intelligence.local_match import (
    database_chunks,
    database_row_to_profile,
    score_profile,
    select_evidence,
    select_ranked_matches,
)

from app.repositories.investor_repository import investor_repository
from app.repositories.rag_repository import rag_repository
from app.schemas.match import IntakeRequest, IntakeResponse

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

MATCH_RESULT_LIMIT = 10


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
    def __init__(self, repository=investor_repository, rag=rag_repository) -> None:
        self._repository = repository
        self._rag = rag

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
            ),
        )

    def _run_database_match(
        self,
        *,
        founder_profile: dict[str, Any],
        connection: Connection,
    ) -> list[dict[str, Any]]:
        results = []
        rows = self._repository.list_match_profiles(connection)
        for row in rows:
            profile = database_row_to_profile(row)
            result = score_profile(founder_profile, profile)
            if not result.get("eligibility", {}).get("passed", True):
                continue
            evidence = self._rag.retrieve_for_match(
                connection,
                investor_slug=str(profile.get("investor_id")),
                founder_profile=founder_profile,
            )
            if not evidence:
                evidence = select_evidence(founder_profile, database_chunks(profile))
            result["evidence"] = evidence
            result["investor_profile"] = build_match_investor_profile(row)
            results.append(result)

        return select_ranked_matches(results, limit=MATCH_RESULT_LIMIT)


match_service = MatchService()

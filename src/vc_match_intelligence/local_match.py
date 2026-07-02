"""Simple local matcher for generated artifacts.

This is a deterministic smoke-test matcher. The production path should use the
database tables, but this helps tune fields before AWS is fully wired up.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import date, datetime
from pathlib import Path
from typing import Any

from psycopg import connect
from psycopg.rows import dict_row


MATCHING_WEIGHTS = {
    "geography_anz_mandate": 15,
    "stage_first_cheque_fit": 15,
    "sector_use_case_fit": 15,
    "recent_deal_similarity": 15,
    "business_model_icp_fit": 10,
    "cheque_round_size_fit": 8,
    "lead_behavior_fit": 8,
    "investor_activity_recency": 6,
    "ai_thesis_appetite": 4,
    "founder_traction_fit": 4,
}

ANZ_MARKETS = {
    "au",
    "australia",
    "australian",
    "nz",
    "new zealand",
    "newzealand",
    "anz",
}
AI_TERMS = {"ai", "artificial intelligence", "machine learning", "ml", "llm", "genai"}
TRACTION_TERMS = {
    "customer",
    "customers",
    "pilot",
    "pilots",
    "paid",
    "revenue",
    "arr",
    "mrr",
    "traction",
    "clinic",
    "clinics",
    "enterprise",
    "growth",
}


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def load_database_profiles(database_url: str) -> list[dict[str, Any]]:
    with connect(database_url, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  id::text,
                  name,
                  slug,
                  investor_type,
                  website_url,
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
                  screening_notes
                FROM investors
                ORDER BY name
                """
            )
            return [database_row_to_profile(dict(row)) for row in cursor.fetchall()]


def database_row_to_profile(row: dict[str, Any]) -> dict[str, Any]:
    geography_focus = row.get("geography_focus") or []
    entry_channels = row.get("entry_channels") or []
    return {
        "investor_id": row.get("slug") or row.get("id"),
        "investor_name": row.get("name"),
        "local_au_anz_fund": any(
            norm(value) in {"au", "australia", "nz", "new zealand"}
            for value in geography_focus
        ),
        "supported_stages": row.get("stage_focus") or [],
        "first_cheque_stages": row.get("stage_focus") or [],
        "supported_sectors": row.get("sector_focus") or [],
        "supported_business_models": row.get("business_model_focus") or [],
        "founder_fit": row.get("founder_fit") or [],
        "cheque_ranges": row.get("cheque_ranges") or [],
        "lead_behavior": row.get("lead_behavior"),
        "ai_appetite": row.get("ai_appetite"),
        "recent_deals": row.get("recent_deals") or [],
        "contact_path": {
            "primary": row.get("preferred_channel"),
            "entry_channels": entry_channels,
        },
        "warm_intro_required": (
            True if entry_channels and "direct_email" not in entry_channels else False
        ),
        "review_needed_fields": [],
        "screening_notes": row.get("screening_notes"),
    }


def database_chunks(profile: dict[str, Any]) -> list[dict[str, Any]]:
    chunks = []
    for deal in profile.get("recent_deals", []) or []:
        if not isinstance(deal, dict):
            continue
        chunks.append(
            {
                "section_key": "recent_deal",
                "entity_type": "investor",
                "entity_id": profile.get("investor_id"),
                "confidence": "medium",
                "review_needed": False,
                "chunk_text": (
                    f"{profile.get('investor_name')} recent deal: "
                    f"{deal.get('company')} {deal.get('round')} "
                    f"{deal.get('amount') or deal.get('amount_text')} as {deal.get('role')} "
                    f"in {deal.get('region') or deal.get('company_geography')}."
                ),
                "source_urls": [],
            }
        )
    return chunks


def norm(value: Any) -> str:
    return str(value or "").strip().lower()


def norm_phrase(value: Any) -> str:
    return norm(value).replace("_", " ").replace("-", " ")


def compact_norm(value: Any) -> str:
    return norm_phrase(value).replace(" ", "")


def text_contains(value: Any, target: Any) -> bool:
    needle = norm_phrase(target)
    if not needle:
        return False
    return needle in norm_phrase(value)


def is_anz_market(value: Any) -> bool:
    normalized = norm_phrase(value)
    compact = compact_norm(value)
    return normalized in ANZ_MARKETS or compact in ANZ_MARKETS


def founder_markets(founder: dict[str, Any]) -> list[Any]:
    return [
        founder.get("company_hq_country"),
        founder.get("primary_market"),
        founder.get("founder_au_anz_connection"),
    ]


def profile_has_anz_mandate(profile: dict[str, Any]) -> bool:
    if bool(profile.get("local_au_anz_fund")):
        return True
    return any(is_anz_market(value) for value in profile.get("geography_focus", []))


def contains_any(values: list[Any], target: Any) -> bool:
    needle = norm_phrase(target)
    compact_needle = compact_norm(target)
    if not needle:
        return False

    for value in values:
        haystack = norm_phrase(value)
        compact_haystack = compact_norm(value)
        if not haystack:
            continue
        if needle in haystack or haystack in needle:
            return True
        if compact_needle in compact_haystack or compact_haystack in compact_needle:
            return True
    return False


def normalize_stage(value: Any) -> str:
    text = norm(value).replace("-", "_").replace(" ", "_")
    aliases = {
        "preseed": "pre_seed",
        "pre_seed": "pre_seed",
        "seed_extension": "seed",
        "series_a": "series_a",
        "series_b": "series_b",
        "series_b+": "series_b",
        "growth": "growth",
    }
    return aliases.get(text, text)


def deal_text(deal: dict[str, Any]) -> str:
    fields = [
        deal.get("company"),
        deal.get("round"),
        deal.get("direction"),
        deal.get("business_model"),
        deal.get("company_geography"),
        deal.get("region"),
        deal.get("role"),
    ]
    return " ".join(str(field) for field in fields if field)


def deal_similarity_score(
    founder: dict[str, Any],
    deal: dict[str, Any],
) -> int:
    text = deal_text(deal)
    score = 0
    stage = founder.get("stage") or founder.get("round_type")
    sector = founder.get("sector")
    business_model = founder.get("business_model")

    if contains_any([deal.get("round"), text], stage):
        score += 4
    if contains_any([deal.get("direction"), deal.get("business_model"), text], sector):
        score += 5
    if contains_any([deal.get("business_model"), text], business_model):
        score += 3
    if any(
        contains_any([deal.get("company_geography"), deal.get("region"), text], market)
        for market in founder_markets(founder)
        if market
    ):
        score += 2
    return min(score, MATCHING_WEIGHTS["recent_deal_similarity"])


def recent_deal_similarity(
    founder: dict[str, Any],
    profile: dict[str, Any],
) -> tuple[int, str | None]:
    best_score = 0
    best_company = None
    for deal in profile.get("recent_deals") or []:
        if not isinstance(deal, dict):
            continue
        score = deal_similarity_score(founder, deal)
        if score > best_score:
            best_score = score
            best_company = deal.get("company")
    return best_score, str(best_company) if best_company else None


def parse_deal_date(value: Any) -> date | None:
    if not value:
        return None
    text = str(value).strip()
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        pass
    try:
        return datetime.strptime(text[:7], "%Y-%m").date()
    except ValueError:
        return None


def activity_recency_score(profile: dict[str, Any]) -> int:
    dates = [
        parsed
        for deal in profile.get("recent_deals") or []
        if isinstance(deal, dict)
        for parsed in [parse_deal_date(deal.get("date"))]
        if parsed is not None
    ]
    if not dates:
        return 2 if profile.get("recent_deals") else 0

    age_days = (date.today() - max(dates)).days
    if age_days <= 365:
        return 6
    if age_days <= 730:
        return 4
    return 2


def founder_is_ai_related(founder: dict[str, Any]) -> bool:
    text = " ".join(
        str(founder.get(field) or "")
        for field in (
            "sector",
            "business_model",
            "one_sentence_summary",
            "traction_summary",
        )
    )
    return any(term in norm_phrase(text) for term in AI_TERMS)


def ai_thesis_score(founder: dict[str, Any], profile: dict[str, Any]) -> int:
    if not founder_is_ai_related(founder):
        return 0
    appetite = norm(profile.get("ai_appetite"))
    if appetite in {"high", "very_high"}:
        return 4
    if appetite in {"medium", "moderate"}:
        return 2
    if contains_any(profile.get("supported_sectors", []), "ai"):
        return 3
    if text_contains(profile.get("screening_notes"), "ai"):
        return 2
    return 0


def founder_traction_score(founder: dict[str, Any], profile: dict[str, Any]) -> int:
    founder_text = " ".join(
        str(founder.get(field) or "")
        for field in (
            "founder_au_anz_connection",
            "traction_summary",
            "traction_status",
            "one_sentence_summary",
        )
    )
    if not founder_text.strip():
        return 0

    profile_terms = profile.get("founder_fit") or []
    if any(contains_any([founder_text], term) for term in profile_terms):
        return 4
    if any(term in norm_phrase(founder_text) for term in TRACTION_TERMS):
        return 2
    return 0


def raise_amount_aud(founder: dict[str, Any]) -> float | None:
    value = founder.get("target_raise_value")
    if value is None:
        return None
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None

    unit = norm(founder.get("target_raise_unit"))
    if unit in {"m", "mn", "million", "millions"}:
        amount *= 1_000_000
    elif unit in {"k", "thousand", "thousands"}:
        amount *= 1_000

    currency = norm(founder.get("target_raise_currency") or "AUD")
    if currency and currency not in {"aud", "a$"}:
        return None
    return amount


def cheque_filter_safe(item: dict[str, Any]) -> bool:
    if item.get("hard_filter_safe") is False:
        return False
    basis = norm(item.get("basis"))
    return "round_size" not in basis and "not_cheque" not in basis


def cheque_range_match(founder: dict[str, Any], profile: dict[str, Any]) -> bool | None:
    amount = raise_amount_aud(founder)
    stage = normalize_stage(founder.get("stage") or founder.get("round_type"))
    ranges = profile.get("cheque_ranges") or []
    if amount is None or not stage or not ranges:
        return None

    stage_ranges = [
        item
        for item in ranges
        if isinstance(item, dict)
        and norm(item.get("currency") or "AUD") == "aud"
        and normalize_stage(item.get("stage")) == stage
    ]
    if not stage_ranges:
        return None

    for item in stage_ranges:
        min_value = item.get("amount_min")
        max_value = item.get("amount_max")
        if min_value is not None and amount < float(min_value):
            continue
        if max_value is not None and amount > float(max_value):
            continue
        return True
    return False


def score_profile(founder: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    breakdown: dict[str, Any] = {key: 0 for key in MATCHING_WEIGHTS}
    strengths: list[str] = []
    risks: list[str] = []

    founder_is_anz = any(is_anz_market(market) for market in founder_markets(founder))
    local_au_anz = profile_has_anz_mandate(profile)
    if founder_is_anz and local_au_anz:
        breakdown["geography_anz_mandate"] = 15
        strengths.append("AU/ANZ mandate appears aligned.")
    elif founder_is_anz:
        breakdown["geography_anz_mandate"] = 6
        risks.append("AU/ANZ founder fit is not clearly local-fund level.")

    stage = founder.get("stage")
    supported_stages = profile.get("supported_stages", [])
    first_cheque_stages = profile.get("first_cheque_stages", [])
    if contains_any(first_cheque_stages, stage):
        breakdown["stage_first_cheque_fit"] = 15
        strengths.append("Stage matches observed first-cheque stages.")
    elif contains_any(supported_stages, stage):
        breakdown["stage_first_cheque_fit"] = 11
        strengths.append("Stage is inside the investor's broader observed range.")
    else:
        risks.append("Stage fit is not obvious from structured data.")

    sector = founder.get("sector")
    if contains_any(profile.get("supported_sectors", []), sector):
        breakdown["sector_use_case_fit"] = 15
        strengths.append("Sector appears in observed investor activity.")
    else:
        risks.append("Sector match needs manual review.")

    deal_similarity, deal_company = recent_deal_similarity(founder, profile)
    breakdown["recent_deal_similarity"] = deal_similarity
    if deal_company and deal_similarity >= 10:
        strengths.append(f"Recent deal evidence is similar: {deal_company}.")
    elif deal_similarity == 0:
        risks.append("No clearly similar recent deal was found in structured data.")

    business_model = founder.get("business_model")
    if contains_any(profile.get("supported_business_models", []), business_model):
        breakdown["business_model_icp_fit"] = 10
        strengths.append("Business model appears in recent deal evidence.")
    else:
        risks.append("Business model match is not directly supported.")

    cheque_fit = cheque_range_match(founder, profile)
    if cheque_fit is True:
        breakdown["cheque_round_size_fit"] = 8
        strengths.append(
            "Raise amount fits observed stage-specific round-size evidence."
        )
    elif cheque_fit is False:
        risks.append(
            "Raise amount is outside observed stage-specific round-size evidence."
        )

    lead_needed = founder.get("lead_needed")
    lead_behavior = norm(profile.get("lead_behavior"))
    if lead_needed is True and any(
        token in lead_behavior for token in ["lead", "sometimes", "both"]
    ):
        breakdown["lead_behavior_fit"] = 8
        strengths.append("Lead behaviour may fit the round need.")
    elif lead_needed is False:
        breakdown["lead_behavior_fit"] = 8
    elif lead_needed is True:
        risks.append("Lead behaviour is not clearly aligned with the founder's need.")

    activity_score = activity_recency_score(profile)
    breakdown["investor_activity_recency"] = activity_score
    if activity_score >= 4:
        strengths.append("Investor has recent activity in the database.")

    ai_score = ai_thesis_score(founder, profile)
    breakdown["ai_thesis_appetite"] = ai_score
    if ai_score >= 3:
        strengths.append("AI thesis appetite supports the match.")

    traction_score = founder_traction_score(founder, profile)
    breakdown["founder_traction_fit"] = traction_score
    if traction_score > 0:
        strengths.append("Founder or traction signals have some investor-fit support.")

    score = sum(int(value) for value in breakdown.values())

    return {
        "investor_id": profile.get("investor_id"),
        "investor_name": profile.get("investor_name"),
        "score": min(score, 100),
        "breakdown": breakdown,
        "strengths": strengths,
        "risks": risks,
        "review_needed_fields": profile.get("review_needed_fields", []),
    }


def select_evidence(
    founder: dict[str, Any], chunks: list[dict[str, Any]], limit: int = 5
) -> list[dict[str, Any]]:
    keywords = [
        founder.get("stage"),
        founder.get("sector"),
        founder.get("business_model"),
        founder.get("company_hq_country"),
    ]
    scored = []
    for item in chunks:
        text = norm(item.get("chunk_text"))
        score = sum(1 for keyword in keywords if keyword and norm(keyword) in text)
        if item.get("section_key") in {"deal_evidence", "partner_routing"}:
            score += 1
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [
        {
            "section_key": item.get("section_key"),
            "entity_type": item.get("entity_type"),
            "entity_id": item.get("entity_id"),
            "confidence": item.get("confidence"),
            "review_needed": item.get("review_needed"),
            "chunk_text": item.get("chunk_text"),
            "source_urls": item.get("source_urls", []),
        }
        for _, item in scored[:limit]
    ]


def run_match(
    founder_path: Path,
    artifacts_dir: Path,
    database_url: str | None = None,
) -> dict[str, Any]:
    founder = load_json(founder_path)
    results = []

    if database_url:
        profile_rows = [
            (profile, database_chunks(profile))
            for profile in load_database_profiles(database_url)
        ]
    else:
        profile_rows = [
            (
                load_json(profile_path),
                load_jsonl(profile_path.parent / "rag_chunks.jsonl"),
            )
            for profile_path in artifacts_dir.glob("*/matching_profile.json")
        ]

    for profile, chunks in profile_rows:
        result = score_profile(founder, profile)
        result["evidence"] = select_evidence(founder, chunks)
        results.append(result)
    results.sort(key=lambda item: item["score"], reverse=True)
    for index, item in enumerate(results, start=1):
        item["rank"] = index
    return {"founder_profile": founder, "results": results}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run a local VC match over generated artifacts"
    )
    parser.add_argument(
        "--founder", required=True, type=Path, help="Founder profile JSON"
    )
    parser.add_argument(
        "--artifacts", default=Path("outputs"), type=Path, help="Artifacts directory"
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        help="Read investors from the unified PostgreSQL database instead of artifacts",
    )
    args = parser.parse_args()

    print(
        json.dumps(
            run_match(args.founder, args.artifacts, args.database_url),
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

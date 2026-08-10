"""Risk-adjusted planning estimate for capital available from matched investors.

The estimate deliberately does not use ``cheque_size_*`` values from formal
stage preferences. Those values describe the total size of observed funding
rounds, not the amount contributed by the investor.
"""

from __future__ import annotations

from math import prod
from typing import Any

CAPACITY_MODEL_VERSION = "v2.0-provisional"
CAPACITY_CANDIDATE_LIMIT = 30
COVERAGE_BUFFER_MULTIPLIER = 1.5
LEAD_PROBABILITY_THRESHOLD = 0.5
MAX_LEAD_CANDIDATES = 5

# Funding-matrix planning assumptions, denominated in AUD. Midpoints use the
# reviewed ranges supplied for the Rally model. Explicit investor cheque data
# takes precedence whenever it is available and safe to use.
STAGE_ASSUMPTIONS: dict[str, dict[str, Any]] = {
    "pre_seed": {
        "lead_midpoint_aud": 650_000,
        "participant_midpoint_aud": 200_000,
        "participant_by_type_aud": {
            "angel": 55_000,
            "angel_group": 150_000,
            "accelerator": 150_000,
            "other": 100_000,
        },
    },
    "seed": {
        "lead_midpoint_aud": 1_500_000,
        "participant_midpoint_aud": 300_000,
        "participant_by_type_aud": {
            "angel": 100_000,
            "angel_group": 250_000,
            "accelerator": 200_000,
            "family_office": 500_000,
            "corporate_vc": 500_000,
            "other": 200_000,
        },
    },
    "series_a": {
        "lead_midpoint_aud": 6_500_000,
        "participant_midpoint_aud": 1_250_000,
        "participant_by_type_aud": {
            "angel": 250_000,
            "angel_group": 500_000,
            "accelerator": 250_000,
            "other": 500_000,
        },
    },
    "series_b": {
        "lead_midpoint_aud": 16_000_000,
        "participant_midpoint_aud": 3_000_000,
        "participant_by_type_aud": {
            "angel": 500_000,
            "angel_group": 1_000_000,
            "accelerator": 500_000,
            "other": 1_000_000,
        },
    },
}

# These are provisional planning factors, not measured Rally conversion rates.
# They must be recalibrated once contacted -> meeting -> diligence -> funded
# outcomes are stored in the product.
TIER_CONVERSION_FACTORS = {
    "strong": 0.35,
    "good": 0.25,
    "possible": 0.12,
    "manual_review": 0.04,
}

CONFIDENCE_MULTIPLIERS = {
    "high": 1.0,
    "medium": 0.85,
    "low": 0.65,
}

CURRENCY_TO_AUD = {
    "AUD": 1.0,
    "NZD": 0.92,
    "USD": 1.53,
}

LEAD_TYPE_MULTIPLIERS = {
    "vc_fund": 1.0,
    "family_office": 1.0,
    "corporate_vc": 1.0,
    "government_fund": 1.0,
    "angel_group": 0.5,
    "angel": 0.25,
    "accelerator": 0.35,
    "other": 0.5,
}


def _number(value: Any, default: float = 0.0) -> float:
    if value is None or isinstance(value, bool):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalise_stage(value: Any) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "preseed": "pre_seed",
        "pre_seed": "pre_seed",
        "angel": "pre_seed",
        "seed": "seed",
        "seriesa": "series_a",
        "series_a": "series_a",
        "seriesb": "series_b",
        "series_b": "series_b",
        "series_b+": "series_b",
        "series_b_plus": "series_b",
    }
    return aliases.get(text, text)


def _normalise_investor_type(value: Any) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if "angel_group" in text or "syndicate" in text:
        return "angel_group"
    if "angel" in text:
        return "angel"
    if "family" in text:
        return "family_office"
    if "corporate" in text:
        return "corporate_vc"
    if "accelerator" in text or "incubator" in text:
        return "accelerator"
    if "government" in text or "public_fund" in text:
        return "government_fund"
    if "vc" in text or "venture" in text or text == "fund":
        return "vc_fund"
    return "other"


def _whole_amount(profile: dict[str, Any], prefix: str) -> float:
    value = _number(profile.get(f"{prefix}_value"))
    unit = str(profile.get(f"{prefix}_unit") or "").strip().lower()
    multiplier = {
        "million": 1_000_000,
        "m": 1_000_000,
        "thousand": 1_000,
        "k": 1_000,
    }.get(unit, 1)
    return max(value * multiplier, 0)


def _score_tier(match: dict[str, Any]) -> str:
    stated = str(match.get("match_tier") or "").strip().lower()
    if stated in TIER_CONVERSION_FACTORS:
        return stated
    score = _number(match.get("score"))
    if score >= 75:
        return "strong"
    if score >= 60:
        return "good"
    if score >= 42:
        return "possible"
    return "manual_review"


def _conversion_factor(match: dict[str, Any]) -> float:
    tier = _score_tier(match)
    base = TIER_CONVERSION_FACTORS[tier]
    confidence = str(match.get("confidence") or "").strip().lower()
    confidence_multiplier = CONFIDENCE_MULTIPLIERS.get(confidence, 0.75)
    profile = match.get("investor_profile") or {}
    warm_intro_multiplier = 1.2 if profile.get("warm_intro_available") else 1.0
    return min(base * confidence_multiplier * warm_intro_multiplier, 0.5)


def _exact_stage_preference(
    profile: dict[str, Any], stage: str
) -> dict[str, Any] | None:
    preferences = profile.get("stage_preferences") or []
    exact = [
        item
        for item in preferences
        if isinstance(item, dict) and _normalise_stage(item.get("stage")) == stage
    ]
    if not exact:
        return None
    return max(exact, key=lambda item: int(_number(item.get("deals_count"))))


def _is_lead_capable(match: dict[str, Any], stage: str) -> bool:
    profile = match.get("investor_profile") or {}
    preference = _exact_stage_preference(profile, stage)
    if preference and (
        bool(preference.get("leads_at_this_stage"))
        or _number(preference.get("lead_count")) > 0
    ):
        return True
    if _number(profile.get("lead_ratio")) >= 0.5:
        return True
    lead_behaviour = str(profile.get("lead_behavior") or "").strip().lower()
    return (
        lead_behaviour in {"lead", "leads_and_follows", "co_lead", "co-lead"}
        or "lead" in lead_behaviour
    )


def _is_round_size_basis(value: Any) -> bool:
    text = str(value or "").lower()
    return "round_size" in text or "not_cheque" in text


def _explicit_cheque_midpoint_aud(profile: dict[str, Any], stage: str) -> float | None:
    usable: list[dict[str, Any]] = []
    for item in profile.get("declared_cheque_ranges") or []:
        if not isinstance(item, dict) or _is_round_size_basis(item.get("basis")):
            continue
        item_stage = _normalise_stage(item.get("stage"))
        if item_stage not in {stage, "", "all", "all_stages"}:
            continue
        minimum = _number(item.get("amount_min"), default=-1)
        maximum = _number(item.get("amount_max"), default=-1)
        if minimum <= 0 and maximum <= 0:
            continue
        usable.append(item)
    if not usable:
        return None

    exact = [item for item in usable if _normalise_stage(item.get("stage")) == stage]
    selected = exact[0] if exact else usable[0]
    minimum = _number(selected.get("amount_min"), default=-1)
    maximum = _number(selected.get("amount_max"), default=-1)
    if minimum > 0 and maximum > 0:
        midpoint = (minimum + maximum) / 2
    else:
        midpoint = max(minimum, maximum)
    currency = str(selected.get("currency") or "AUD").upper()
    return midpoint * CURRENCY_TO_AUD.get(currency, 1.0)


def _planning_cheque_aud(
    match: dict[str, Any], stage: str, *, role: str
) -> tuple[float, str]:
    profile = match.get("investor_profile") or {}
    explicit = _explicit_cheque_midpoint_aud(profile, stage)
    if explicit is not None:
        return explicit, "investor_record"

    assumption = STAGE_ASSUMPTIONS[stage]
    investor_type = _normalise_investor_type(profile.get("investor_type"))
    if role == "lead_candidate":
        amount = float(assumption["lead_midpoint_aud"])
        amount *= LEAD_TYPE_MULTIPLIERS[investor_type]
        participant_floor = float(
            assumption["participant_by_type_aud"].get(
                investor_type, assumption["participant_midpoint_aud"]
            )
        )
        return max(amount, participant_floor), "stage_type_prior"

    return (
        float(
            assumption["participant_by_type_aud"].get(
                investor_type, assumption["participant_midpoint_aud"]
            )
        ),
        "stage_type_prior",
    )


def _ranked_capacity_candidates(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    eligible = [
        match for match in matches if match.get("eligibility", {}).get("passed", True)
    ]
    return sorted(
        eligible,
        key=lambda item: (
            -int(_number(item.get("score"))),
            str(item.get("investor_name") or ""),
        ),
    )[:CAPACITY_CANDIDATE_LIMIT]


def estimate_investment_capacity(
    founder: dict[str, Any], matches: list[dict[str, Any]]
) -> tuple[dict[str, Any] | None, dict[str, dict[str, Any]]]:
    """Return a V2 capacity summary and per-investor calculation details."""
    stage = _normalise_stage(founder.get("stage") or founder.get("round_type"))
    if stage not in STAGE_ASSUMPTIONS:
        return None, {}

    target_amount = _whole_amount(founder, "target_raise")
    if target_amount <= 0:
        return None, {}
    committed_amount = min(_whole_amount(founder, "committed_capital"), target_amount)
    remaining_target = max(target_amount - committed_amount, 0)
    currency = str(founder.get("target_raise_currency") or "AUD").upper()
    currency_to_aud = CURRENCY_TO_AUD.get(currency)
    if not currency_to_aud:
        return None, {}

    candidates = _ranked_capacity_candidates(matches)
    lead_needed = founder.get("lead_needed") is True and remaining_target > 0
    lead_candidates = (
        [match for match in candidates if _is_lead_capable(match, stage)][
            :MAX_LEAD_CANDIDATES
        ]
        if lead_needed
        else []
    )
    lead_ids = {str(match.get("investor_id")) for match in lead_candidates}
    participant_candidates = [
        match for match in candidates if str(match.get("investor_id")) not in lead_ids
    ]

    details: dict[str, dict[str, Any]] = {}
    lead_failures: list[float] = []
    lead_expected_aud = 0.0
    lead_gross_aud = 0.0
    previous_failure_probability = 1.0
    for match in lead_candidates:
        investor_id = str(match.get("investor_id"))
        conversion = _conversion_factor(match)
        cheque_aud, source = _planning_cheque_aud(match, stage, role="lead_candidate")
        selection_probability = previous_failure_probability * conversion
        expected_aud = selection_probability * cheque_aud
        previous_failure_probability *= 1 - conversion
        lead_failures.append(1 - conversion)
        lead_expected_aud += expected_aud
        lead_gross_aud = max(lead_gross_aud, cheque_aud)
        details[investor_id] = {
            "role": "lead_candidate",
            "tier": _score_tier(match),
            "conversion_factor": conversion,
            "selection_probability": selection_probability,
            "planning_cheque": cheque_aud / currency_to_aud,
            "risk_adjusted_amount": expected_aud / currency_to_aud,
            "currency": currency,
            "cheque_source": source,
            "counted": True,
        }

    participant_gross_aud = 0.0
    participant_expected_aud = 0.0
    for match in participant_candidates:
        investor_id = str(match.get("investor_id"))
        conversion = _conversion_factor(match)
        cheque_aud, source = _planning_cheque_aud(match, stage, role="participant")
        expected_aud = conversion * cheque_aud
        participant_gross_aud += cheque_aud
        participant_expected_aud += expected_aud
        details[investor_id] = {
            "role": "participant",
            "tier": _score_tier(match),
            "conversion_factor": conversion,
            "selection_probability": conversion,
            "planning_cheque": cheque_aud / currency_to_aud,
            "risk_adjusted_amount": expected_aud / currency_to_aud,
            "currency": currency,
            "cheque_source": source,
            "counted": True,
        }

    gross_capacity = (lead_gross_aud + participant_gross_aud) / currency_to_aud
    risk_adjusted_capacity = (
        lead_expected_aud + participant_expected_aud
    ) / currency_to_aud
    lead_probability = 1 - prod(lead_failures) if lead_needed else 1.0
    lead_requirement_met = (
        not lead_needed or lead_probability >= LEAD_PROBABILITY_THRESHOLD
    )
    required_gross_capacity = remaining_target * COVERAGE_BUFFER_MULTIPLIER
    coverage_buffer_met = gross_capacity >= required_gross_capacity
    risk_adjusted_coverage_met = risk_adjusted_capacity >= remaining_target
    is_enough = remaining_target <= 0 or (
        coverage_buffer_met and risk_adjusted_coverage_met and lead_requirement_met
    )

    tier_breakdown = []
    for tier, factor in TIER_CONVERSION_FACTORS.items():
        tier_matches = [match for match in candidates if _score_tier(match) == tier]
        if tier_matches:
            tier_breakdown.append(
                {
                    "tier": tier,
                    "candidate_count": len(tier_matches),
                    "base_conversion_factor": factor,
                }
            )

    summary = {
        "model_version": CAPACITY_MODEL_VERSION,
        "currency": currency,
        "target_amount": round(target_amount),
        "committed_amount": round(committed_amount),
        "remaining_target": round(remaining_target),
        "gross_capacity": round(gross_capacity),
        "risk_adjusted_capacity": round(risk_adjusted_capacity),
        "coverage_buffer_multiplier": COVERAGE_BUFFER_MULTIPLIER,
        "required_gross_capacity": round(required_gross_capacity),
        "coverage_buffer_met": coverage_buffer_met,
        "risk_adjusted_coverage_met": risk_adjusted_coverage_met,
        "candidate_count": len(candidates),
        "participant_candidate_count": len(participant_candidates),
        "lead_needed": lead_needed,
        "lead_candidate_count": len(lead_candidates),
        "lead_probability": lead_probability,
        "lead_probability_threshold": LEAD_PROBABILITY_THRESHOLD,
        "lead_requirement_met": lead_requirement_met,
        "tier_breakdown": tier_breakdown,
        "is_enough": is_enough,
        "assumption_note": (
            "Provisional planning factors; recalibrate with Rally funnel outcomes. "
            "Observed total round sizes are not used as investor cheque amounts."
        ),
    }
    return summary, details

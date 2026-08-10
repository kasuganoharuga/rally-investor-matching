from app.services.investment_capacity import (
    CAPACITY_CANDIDATE_LIMIT,
    COVERAGE_BUFFER_MULTIPLIER,
    estimate_investment_capacity,
)


def founder(
    *,
    target: float = 1_000_000,
    committed: float = 0,
    lead_needed: bool = False,
) -> dict[str, object]:
    return {
        "stage": "pre_seed",
        "target_raise_value": target,
        "target_raise_unit": "absolute",
        "target_raise_currency": "AUD",
        "committed_capital_value": committed,
        "committed_capital_unit": "absolute",
        "lead_needed": lead_needed,
    }


def match(
    index: int,
    *,
    score: int = 80,
    lead_capable: bool = False,
    investor_type: str = "vc_fund",
    declared_cheque_ranges: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    return {
        "investor_id": f"investor-{index}",
        "investor_name": f"Investor {index}",
        "score": score,
        "match_tier": "strong" if score >= 75 else "possible",
        "confidence": "high",
        "eligibility": {"passed": True},
        "investor_profile": {
            "investor_type": investor_type,
            "lead_behavior": "lead" if lead_capable else "participant",
            "lead_ratio": 0.75 if lead_capable else 0,
            "warm_intro_available": False,
            "declared_cheque_ranges": declared_cheque_ranges or [],
            "stage_preferences": [
                {
                    "stage": "pre_seed",
                    "deals_count": 3,
                    "lead_count": 1 if lead_capable else 0,
                    "leads_at_this_stage": lead_capable,
                }
            ],
        },
    }


def test_capacity_uses_a_standard_top_30_pool() -> None:
    matches = [match(index, score=100 - index) for index in range(40)]

    summary, details = estimate_investment_capacity(founder(), matches)

    assert summary is not None
    assert summary["candidate_count"] == CAPACITY_CANDIDATE_LIMIT
    assert len(details) == CAPACITY_CANDIDATE_LIMIT


def test_capacity_uses_verified_cheque_but_ignores_round_size_ranges() -> None:
    verified = match(
        1,
        declared_cheque_ranges=[
            {
                "stage": "pre_seed",
                "amount_min": 100_000,
                "amount_max": 500_000,
                "currency": "AUD",
                "basis": "official_first_cheque_size",
            }
        ],
    )
    round_size_only = match(
        2,
        declared_cheque_ranges=[
            {
                "stage": "pre_seed",
                "amount_min": 10_000_000,
                "amount_max": 20_000_000,
                "currency": "AUD",
                "basis": "recent_deal_round_size_range_not_cheque",
            }
        ],
    )

    _, details = estimate_investment_capacity(founder(), [verified, round_size_only])

    assert details["investor-1"]["planning_cheque"] == 300_000
    assert details["investor-1"]["cheque_source"] == "investor_record"
    assert details["investor-2"]["planning_cheque"] == 200_000
    assert details["investor-2"]["cheque_source"] == "stage_type_prior"


def test_capacity_requires_lead_coverage_when_requested() -> None:
    matches = [match(index) for index in range(10)]

    summary, _ = estimate_investment_capacity(
        founder(target=100_000, lead_needed=True), matches
    )

    assert summary is not None
    assert summary["lead_candidate_count"] == 0
    assert summary["lead_requirement_met"] is False
    assert summary["is_enough"] is False


def test_capacity_uses_remaining_target_after_confirmed_commitments() -> None:
    matches = [match(index, lead_capable=index < 3) for index in range(10)]

    summary, _ = estimate_investment_capacity(
        founder(target=1_000_000, committed=400_000, lead_needed=True), matches
    )

    assert summary is not None
    assert summary["remaining_target"] == 600_000
    assert summary["required_gross_capacity"] == round(
        600_000 * COVERAGE_BUFFER_MULTIPLIER
    )
    assert summary["lead_probability"] > 0.5

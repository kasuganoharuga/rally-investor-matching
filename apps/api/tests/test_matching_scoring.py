from app.services.founder_parser_service import normalize_parsed_founder_profile
from app.services.matching_scoring import (
    MATCHING_WEIGHTS,
    founder_customer_type,
    score_profile,
    score_theme_fit,
    score_tier,
)
from app.services.matching_taxonomy import (
    ALLOWED_THEMES,
    SECTOR_THEMES,
    THEME_RELATIONS,
    normalize_customer_type_code,
)


def test_customer_type_aliases_map_b2b_to_enterprise() -> None:
    assert normalize_customer_type_code("B2B") == "enterprise"
    assert normalize_customer_type_code("b2c") == "consumer"
    assert normalize_customer_type_code("SME") == "smb"
    assert founder_customer_type({"customer_type": "B2B"}) == "enterprise"


def test_normalize_parsed_founder_profile_splits_primary_secondary() -> None:
    profile = normalize_parsed_founder_profile(
        {
            "actual_sector": ["enterprise_software_data_security", "not_a_sector"],
            "primary_themes": ["ai_compute_infrastructure"],
            "secondary_themes": [
                "cloud_data_infrastructure",
                "developer_tools_app_platforms",
                "productivity_collaboration",
            ],
            "customer_type": "B2B",
        }
    )
    assert profile["actual_sector"] == ["enterprise_software_data_security"]
    assert profile["primary_themes"] == ["ai_compute_infrastructure"]
    assert profile["secondary_themes"] == [
        "cloud_data_infrastructure",
        "developer_tools_app_platforms",
    ]
    assert profile["actual_themes"] == [
        "ai_compute_infrastructure",
        "cloud_data_infrastructure",
        "developer_tools_app_platforms",
    ]
    assert profile["customer_type"] == "enterprise"
    assert all(theme in ALLOWED_THEMES for theme in profile["actual_themes"])
    assert all(
        theme in SECTOR_THEMES["enterprise_software_data_security"]
        for theme in profile["actual_themes"]
    )


def test_normalize_legacy_actual_themes_back_compat() -> None:
    profile = normalize_parsed_founder_profile(
        {
            "actual_sector": ["healthcare_life_sciences"],
            "actual_themes": ["diagnostics", "medical_devices", "invented_theme"],
        }
    )
    assert profile["primary_themes"] == ["diagnostics"]
    assert profile["secondary_themes"] == ["medical_devices"]
    assert profile["actual_themes"] == ["diagnostics", "medical_devices"]


def test_theme_fit_gives_related_partial_credit() -> None:
    founder_taxonomy = {
        "actual_sector": ["enterprise_software_data_security"],
        "primary_themes": ["ai_compute_infrastructure"],
        "secondary_themes": [],
        "actual_themes": ["ai_compute_infrastructure"],
    }
    pref = {
        "actual_themes": ["cloud_data_infrastructure", "enterprise_data_platforms"],
        "dimension_distributions": {},
    }
    score, matches, meta = score_theme_fit(
        founder_taxonomy,
        pref,
        {"supported_themes": []},
        theme_prevalence={"ai_compute_infrastructure": 20},
    )
    assert score >= 7
    assert meta["match_type"] == "related"
    assert matches


def test_theme_relations_cover_multiple_sectors() -> None:
    assert "diagnostics" in THEME_RELATIONS
    assert "payments_settlement" in THEME_RELATIONS
    assert "agtech_farm_management" in THEME_RELATIONS
    assert len(THEME_RELATIONS) >= 40


def test_weight_rebalance_sums_to_100() -> None:
    assert sum(MATCHING_WEIGHTS.values()) == 100
    assert MATCHING_WEIGHTS["theme_fit"] == 20
    assert MATCHING_WEIGHTS["sector_fit"] == 20
    assert MATCHING_WEIGHTS["recent_deal_similarity"] == 25
    assert MATCHING_WEIGHTS["customer_icp_fit"] == 5


def test_score_tier_thresholds_are_calibrated() -> None:
    assert score_tier(75) == "strong"
    assert score_tier(60) == "good"
    assert score_tier(42) == "possible"
    assert score_tier(41) == "manual_review"


def test_sparse_theme_non_match_is_unknown_not_hard_zero_denominator() -> None:
    founder = {
        "stage": "seed",
        "company_hq_country": "Australia",
        "primary_market": "Australia",
        "actual_sector": ["enterprise_software_data_security"],
        "primary_themes": ["ai_compute_infrastructure"],
        "secondary_themes": [],
        "actual_themes": ["ai_compute_infrastructure"],
        "customer_type": "enterprise",
        "business_model": "subscription_saas",
        "lead_needed": True,
        "target_raise_value": 2,
        "target_raise_currency": "AUD",
        "target_raise_unit": "m",
    }
    profile = {
        "investor_id": "inv-1",
        "investor_name": "Example Ventures",
        "investor_type": "vc",
        "hq_country": "Australia",
        "geography_focus": ["Australia"],
        "supported_sectors": ["fintech_financial_services"],
        "supported_themes": ["payments_settlement"],
        "stage_preferences": [
            {
                "stage": "seed",
                "deals_count": 4,
                "lead_count": 2,
                "participant_count": 2,
                "leads_at_this_stage": True,
                "data_quality": "high",
                "recent_activity_score": 0.8,
                "actual_sector": ["fintech_financial_services"],
                "actual_themes": ["payments_settlement"],
                "dimension_distributions": {
                    "customer_type": {"weighted": {"enterprise": 0.9}},
                    "business_model": {"weighted": {"subscription_saas": 0.8}},
                },
                "cheque_size_min_usd": 500_000,
                "cheque_size_max_usd": 3_000_000,
                "evidence_refs": [],
            }
        ],
    }
    result = score_profile(
        founder,
        profile,
        theme_prevalence={"ai_compute_infrastructure": 1},
    )
    assert result["theme_evidence"]["evidence_status"] == "sparse_evidence"
    assert result["breakdown"]["theme_fit"] == 0
    assert result["assessable_points"] == 80  # theme_fit excluded from denominator
    assert result["normalized_score"] > result["raw_score"]
    assert result["score"] == result["normalized_score"]
    assert "theme_coverage" in result["missing_evidence"]

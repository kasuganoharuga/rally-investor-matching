"""Formal-data matcher for observed investor preferences.

The V1 matching path uses the formal tables:
- public.investors
- public.investor_actual_preferences
- public.investor_actual_stage_preferences
- public.funding_rounds / deal_investors / investee_company_profiles

It deliberately scores stage-specific observed behaviour instead of one broad
investor average.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from app.services.matching_taxonomy import (
    SPARSE_THEME_PREF_THRESHOLD,
    THEME_TO_SECTOR,
    best_related_theme_match,
    normalize_customer_type_code,
)

MATCHING_WEIGHTS = {
    "stage_evidence_depth": 10,
    "geography_fit": 5,
    "sector_fit": 20,
    "theme_fit": 20,
    "recent_deal_similarity": 25,
    "customer_icp_fit": 5,
    "cheque_size_fit": 5,
    "lead_behavior_fit": 5,
    "data_quality_recency": 5,
}

DEFAULT_MATCH_RESULT_LIMIT = 20

DIRECT_VC_POOL = "direct_vc_pool"
ANGEL_GROUP_POOL = "angel_group_pool"
SYNDICATE_POOL = "syndicate_pool"
PLATFORM_ROUTING_POOL = "platform_routing_pool"
WATCHLIST_POOL = "watchlist_pool"

ROUTING_POOL_LABELS = {
    DIRECT_VC_POOL: "Best direct investors",
    ANGEL_GROUP_POOL: "Relevant angel groups",
    SYNDICATE_POOL: "Relevant syndicate routes",
    PLATFORM_ROUTING_POOL: "Platform / ecosystem routes",
    WATCHLIST_POOL: "Watchlist / manual review",
}

POOL_DISPLAY_ORDER = [
    DIRECT_VC_POOL,
    ANGEL_GROUP_POOL,
    SYNDICATE_POOL,
    PLATFORM_ROUTING_POOL,
    WATCHLIST_POOL,
]

POOL_SELECTION_QUOTAS = {
    DIRECT_VC_POOL: 8,
    ANGEL_GROUP_POOL: 2,
    SYNDICATE_POOL: 2,
    PLATFORM_ROUTING_POOL: 1,
    WATCHLIST_POOL: 1,
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
GLOBAL_MARKETS = {"global", "international", "worldwide", "apac", "asia pacific"}
ADJACENT_STAGES = {
    "pre_seed": {"seed"},
    "seed": {"pre_seed", "series_a"},
    "series_a": {"seed", "series_b", "growth"},
    "series_b": {"series_a", "series_c_plus", "growth"},
    "series_c_plus": {"series_b", "growth"},
    "growth": {"series_a", "series_b", "series_c_plus"},
}
AI_TERMS = {"ai", "artificial intelligence", "machine learning", "ml", "llm", "genai"}

SECTOR_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "healthcare_life_sciences",
        (
            "health",
            "medical",
            "clinic",
            "hospital",
            "patient",
            "biotech",
            "pharma",
            "drug",
            "care",
            "detox",
            "recovery",
            "genomics",
            "dna sequencing",
            "accessibility",
            "assistive",
            "deaf",
            "dementia",
            "longevity",
            "functional medicine",
            "wellness",
            "digital health infrastructure",
            "orthopaedic",
            "orthopedic",
            "regenerative medicine",
        ),
    ),
    (
        "resources_mining_metals",
        ("mining", "mineral", "metal", "lithium", "nickel", "copper", "gold", "ore"),
    ),
    (
        "energy_climate",
        (
            "climate",
            "energy",
            "solar",
            "battery",
            "hydrogen",
            "decarbon",
            "emissions",
            "recycling",
            "waste",
            "biodiversity",
            "natural capital",
            "nature investment",
            "energy infrastructure",
            "gas infrastructure",
            "reusable cup",
            "single use waste",
            "biomaterials",
            "microbial cellulose",
        ),
    ),
    (
        "aerospace_space_defence",
        ("space", "satellite", "aerospace", "aviation", "defence", "defense"),
    ),
    (
        "fintech_financial_services",
        (
            "fintech",
            "finance",
            "financial",
            "payment",
            "wealth",
            "insurance",
            "lending",
            "bank",
            "trading",
            "bitcoin",
            "capital markets",
            "investing platform",
            "public market investment",
            "crowdfunding",
            "equity funding",
            "consumer lending",
            "retail finance",
            "harmful spending",
            "due diligence",
        ),
    ),
    (
        "enterprise_software_data_security",
        (
            "software",
            "saas",
            "enterprise",
            "workflow",
            "data",
            "security",
            "cyber",
            "compliance",
            "copilot",
            "automation",
            "platform",
            "customer research",
            "user research",
            "brand intelligence",
            "sales intelligence",
            "contact centre",
            "contact center",
            "customer support",
            "legal technology",
            "legaltech",
            "tender",
            "proposal",
            "compliance checking",
            "ai governance",
            "agent governance",
            "cloud finops",
            "cloud cost",
            "finops",
            "field service",
            "event planning",
            "digital receipt",
            "website experimentation",
            "product onboarding",
            "screen sharing",
            "rental operations",
            "knowledge security",
            "agentic ai",
            "analytics",
            "measurement and prediction",
        ),
    ),
    (
        "education_workforce",
        (
            "education",
            "learning",
            "training",
            "workforce",
            "career",
            "skill",
            "teacher",
            "school",
            "curriculum",
            "higher education",
            "vocational education",
            "youth entrepreneurship",
            "future skills",
        ),
    ),
    (
        "industrial_robotics_automation",
        (
            "robot",
            "robotics",
            "automation",
            "manufacturing",
            "drone",
            "autonomous",
            "fleet maintenance",
            "fleet management",
            "equipment hire",
        ),
    ),
    (
        "food_agriculture",
        (
            "food",
            "agriculture",
            "agtech",
            "farm",
            "livestock",
            "seafood",
            "aquaculture",
            "grocery",
            "dog food",
            "pet nutrition",
            "beverage",
            "cocktail foamer",
        ),
    ),
    (
        "transport_logistics_infrastructure",
        (
            "transport",
            "logistics",
            "freight",
            "fleet",
            "fleet management",
            "fleet maintenance",
            "infrastructure",
            "mobility",
        ),
    ),
    (
        "property_construction",
        (
            "property",
            "construction",
            "real estate",
            "building",
            "contractor",
            "site safety",
            "built environment",
            "property management",
            "jobsite",
            "construction safety",
            "construction document",
        ),
    ),
    (
        "consumer_marketplace",
        (
            "consumer",
            "marketplace",
            "ecommerce",
            "retail",
            "restaurant",
            "fitness",
            "pet",
            "dog food",
            "brand launch",
            "consumer brand",
            "growth automation",
        ),
    ),
)

THEME_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("clinical_decision_support", ("clinical", "hospital", "clinic")),
    (
        "digital_health_care_coordination",
        (
            "care coordination",
            "home care",
            "aged care",
            "detox",
            "recovery",
            "digital health infrastructure",
        ),
    ),
    (
        "digital_health_infrastructure",
        ("digital health infrastructure", "national digital health infrastructure"),
    ),
    (
        "wellness_mental_health",
        ("wellness", "emotional wellness", "aromatherapy", "scent intelligence"),
    ),
    (
        "accessibility_assistive_technology",
        ("accessibility", "assistive technology", "deaf", "hearing impaired"),
    ),
    ("medical_devices", ("medical device", "biofeedback", "device")),
    ("diagnostics", ("diagnostic", "testing", "sensing", "sensing solution")),
    (
        "biotech_life_sciences",
        (
            "biotech",
            "genomics",
            "dna sequencing",
            "peptide",
            "regenerative medicine",
            "orthopaedic",
            "orthopedic",
        ),
    ),
    ("mineral_exploration_drilling", ("exploration", "drilling")),
    ("mineral_processing", ("processing", "purification")),
    ("critical_minerals", ("critical mineral", "lithium", "rare earth")),
    ("battery_storage", ("battery", "storage")),
    (
        "renewable_distributed_energy",
        (
            "renewable",
            "solar",
            "solar system",
            "solar systems",
            "distributed energy",
            "printed solar",
            "flexible photovoltaic",
        ),
    ),
    (
        "circular_waste_recycling",
        (
            "waste",
            "recycling",
            "circular",
            "biomass energy",
            "reusable cup",
            "single use waste",
        ),
    ),
    ("energy_infrastructure", ("energy infrastructure", "gas infrastructure")),
    (
        "biomaterials_sustainable_materials",
        ("biomaterials", "biomaterial", "microbial cellulose"),
    ),
    (
        "nature_biodiversity_finance",
        ("nature investment", "biodiversity", "natural capital"),
    ),
    ("space_launch_transport", ("launch", "space transport")),
    ("satellite_space_systems", ("satellite", "orbital")),
    ("defence_dual_use", ("defence", "defense", "dual use")),
    ("payments_settlement", ("payment", "settlement")),
    (
        "digital_assets_web3",
        (
            "crypto",
            "web3",
            "on chain",
            "onchain",
            "stablecoin",
            "bitcoin",
            "solana",
            "perpetual futures",
            "non custodial crypto swap",
            "crypto fintech",
        ),
    ),
    (
        "capital_markets_trading_infrastructure",
        ("capital markets", "trading infrastructure", "bitcoin investment"),
    ),
    (
        "retail_investing_platforms",
        ("investing platform", "investment platform", "public market investment"),
    ),
    (
        "capital_formation_crowdfunding",
        ("equity crowdfunding", "crowdfunding", "equity funding"),
    ),
    (
        "consumer_finance_banking",
        ("consumer lending", "consumer finance", "retail finance", "banking"),
    ),
    ("lending_credit_risk", ("lending", "credit", "loan", "non bank credit")),
    ("wealth_asset_management", ("wealth", "asset management", "financial adviser")),
    (
        "financial_advice_workflows",
        ("financial adviser", "financial advisor", "advice"),
    ),
    (
        "fund_admin_private_markets",
        ("fund administration", "private market", "investment due diligence"),
    ),
    (
        "enterprise_data_platforms",
        ("data platform", "analytics", "intelligence", "measurement and prediction"),
    ),
    (
        "productivity_collaboration",
        ("productivity", "collaboration", "workspace", "product onboarding"),
    ),
    ("content_design_tools", ("content", "design", "document generation")),
    (
        "data_privacy_security",
        ("security", "cyber", "privacy", "code security", "logic level code"),
    ),
    ("cloud_data_infrastructure", ("cloud", "data centre", "data center")),
    ("ai_compute_infrastructure", ("gpu", "ai infrastructure", "compute")),
    (
        "retail_operations_order_management",
        ("order management", "inventory", "digital receipt", "receipt infrastructure"),
    ),
    ("digital_twin_infrastructure", ("digital twin", "critical infrastructure")),
    (
        "product_analytics_user_research",
        (
            "product analytics",
            "user path",
            "user research",
            "customer research",
            "website experimentation",
            "a/b test",
        ),
    ),
    (
        "sales_marketing_intelligence",
        (
            "sales intelligence",
            "buying signal",
            "brand intelligence",
            "sales coaching",
            "brand launch",
            "growth automation",
        ),
    ),
    (
        "vertical_business_operations",
        (
            "workforce management",
            "operations system",
            "field service",
            "event planning",
            "workflow intelligence",
            "fitness business",
            "member engagement",
            "rental operations",
            "business operating system",
        ),
    ),
    (
        "customer_support_contact_center",
        (
            "contact centre",
            "contact center",
            "contact centres",
            "contact centers",
            "customer support",
        ),
    ),
    (
        "legaltech_contract_workflows",
        ("legal", "legaltech", "law firm", "contract", "drafting"),
    ),
    (
        "developer_tools_app_platforms",
        ("developer", "app development", "app platform", "software development"),
    ),
    (
        "compliance_risk_workflows",
        ("compliance checking", "compliance workflow", "regulatory workflow"),
    ),
    (
        "ai_governance_security",
        (
            "ai governance",
            "agent governance",
            "ai security",
            "model governance",
            "agentic ai",
            "knowledge security",
        ),
    ),
    ("proposal_tender_workflows", ("tender", "proposal workflow", "proposal")),
    ("cloud_finops", ("cloud finops", "finops", "cloud cost")),
    ("industrial_robotics", ("robotics", "robot")),
    ("autonomous_navigation_systems", ("autonomous", "navigation", "drone")),
    (
        "asset_maintenance_fleet_management",
        (
            "fleet maintenance",
            "fleet management",
            "maintenance management",
            "equipment hire",
        ),
    ),
    ("computer_vision_inspection", ("computer vision", "inspection")),
    (
        "education_training_platforms",
        (
            "education",
            "learning",
            "teacher",
            "school",
            "curriculum",
            "teaching",
            "assessment",
            "higher education",
            "vocational education",
            "youth entrepreneurship",
            "future skills",
        ),
    ),
    ("agtech_farm_management", ("farm", "orchard", "irrigation", "nutrient")),
    ("livestock_management", ("livestock", "stockmanship", "animal")),
    ("aquaculture_seafood", ("seafood", "aquaculture", "saline water")),
    (
        "food_processing_manufacturing",
        ("food manufacturing", "preserves", "beverage", "cocktail foamer"),
    ),
    ("logistics_supply_chain", ("logistics", "supply chain")),
    ("road_freight_mobility", ("road", "freight", "motorway")),
    ("construction_payments_finance", ("construction payment", "contractor finance")),
    (
        "real_estate_construction_workflows",
        (
            "construction",
            "site safety",
            "compliance records",
            "built environment",
            "property management",
            "jobsite safety",
            "construction safety",
            "construction document",
        ),
    ),
    ("property_transaction_workflows", ("property transaction", "estate")),
    ("marketplace_commerce", ("marketplace", "restaurant", "promotion", "commerce")),
    ("grocery_meal_planning", ("meal planning", "grocery")),
    ("pet_care_nutrition", ("pet", "dog food")),
)


def norm(value: Any) -> str:
    return str(value or "").strip().lower()


def norm_phrase(value: Any) -> str:
    return norm(value).replace("_", " ").replace("-", " ")


def compact_norm(value: Any) -> str:
    return norm_phrase(value).replace(" ", "")


def to_float(value: Any, default: float = 0) -> float:
    if value is None:
        return default
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def contains_keyword(text: str, keyword: str) -> bool:
    normalized_keyword = norm_phrase(keyword)
    return f" {normalized_keyword} " in f" {text} " or normalized_keyword in text


def normalize_stage(value: Any) -> str:
    text = norm(value).replace("-", "_").replace(" ", "_")
    aliases = {
        "preseed": "pre_seed",
        "pre_seed": "pre_seed",
        "pre_series_a": "seed",
        "seed_extension": "seed",
        "series_a": "series_a",
        "series_b": "series_b",
        "series_c": "series_c_plus",
        "series_d": "series_c_plus",
        "series_e": "series_c_plus",
        "series_f": "series_c_plus",
        "growth": "growth",
    }
    return aliases.get(text, text)


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


def founder_is_anz(founder: dict[str, Any]) -> bool:
    return any(is_anz_market(value) for value in founder_markets(founder))


def profile_has_anz_mandate(profile: dict[str, Any]) -> bool:
    values = [
        profile.get("hq_country"),
        *(profile.get("geography_focus") or []),
    ]
    return any(is_anz_market(value) for value in values)


def profile_has_global_mandate(profile: dict[str, Any]) -> bool:
    return any(
        norm_phrase(value) in GLOBAL_MARKETS
        for value in profile.get("geography_focus", [])
    )


def infer_founder_taxonomy(founder: dict[str, Any]) -> dict[str, list[str]]:
    explicit_sector = [
        str(item) for item in as_list(founder.get("actual_sector")) if str(item).strip()
    ]
    primary_themes = [
        str(item)
        for item in as_list(founder.get("primary_themes"))
        if str(item).strip()
    ]
    secondary_themes = [
        str(item)
        for item in as_list(founder.get("secondary_themes"))
        if str(item).strip() and str(item) not in primary_themes
    ]
    explicit_themes = [
        str(item) for item in as_list(founder.get("actual_themes")) if str(item).strip()
    ]
    themes = list(dict.fromkeys(primary_themes + secondary_themes + explicit_themes))
    if explicit_sector or themes:
        return {
            "actual_sector": explicit_sector,
            "actual_themes": themes,
            "primary_themes": primary_themes,
            "secondary_themes": secondary_themes,
        }

    text = " ".join(
        norm_phrase(founder.get(field))
        for field in (
            "sector",
            "business_model",
            "one_sentence_summary",
            "traction_summary",
            "primary_market",
        )
        if founder.get(field)
    )
    sectors = [
        sector
        for sector, keywords in SECTOR_RULES
        if any(contains_keyword(text, keyword) for keyword in keywords)
    ]
    themes = [
        theme
        for theme, keywords in THEME_RULES
        if any(contains_keyword(text, keyword) for keyword in keywords)
    ]
    if not sectors and founder.get("sector"):
        sectors.append(norm_phrase(founder.get("sector")).replace(" ", "_"))
    if not themes and founder.get("business_model"):
        themes.append(norm_phrase(founder.get("business_model")).replace(" ", "_"))

    inferred = list(dict.fromkeys(themes))
    return {
        "actual_sector": list(dict.fromkeys(sectors)),
        "actual_themes": inferred,
        "primary_themes": inferred[:1],
        "secondary_themes": inferred[1:3],
    }


def founder_customer_type(founder: dict[str, Any]) -> str | None:
    value = founder.get("customer_type") or founder.get("target_customer")
    if value:
        return normalize_customer_type_code(str(value))

    text = " ".join(
        norm_phrase(founder.get(field))
        for field in ("business_model", "one_sentence_summary", "traction_summary")
        if founder.get(field)
    )
    if any(term in text for term in ("hospital", "clinic", "healthcare provider")):
        return "healthcare_provider"
    if any(term in text for term in ("consumer", "b2c", "parents", "pet")):
        return "consumer"
    if any(term in text for term in ("smb", "small business", "restaurant")):
        return "smb"
    if any(term in text for term in ("enterprise", "b2b", "company", "companies")):
        return "enterprise"
    return None


def founder_business_model(founder: dict[str, Any]) -> str | None:
    value = norm_phrase(founder.get("business_model"))
    if not value:
        return None
    if "saas" in value or "subscription" in value:
        return "subscription_saas"
    if "marketplace" in value:
        return "marketplace_take_rate"
    if "usage" in value:
        return "usage_based"
    if "hardware" in value:
        return "hardware_sales"
    if "licens" in value:
        return "licensing"
    if "service" in value:
        return "services"
    return value.replace(" ", "_")


def founder_ai_relevance(founder: dict[str, Any]) -> str:
    value = norm_phrase(founder.get("ai_relevance"))
    if value:
        return value.replace(" ", "_")
    text = " ".join(
        norm_phrase(founder.get(field))
        for field in ("sector", "one_sentence_summary", "traction_summary")
        if founder.get(field)
    )
    if any(
        term in text for term in ("gpu", "ai infrastructure", "model infrastructure")
    ):
        return "ai_infrastructure"
    if "ai native" in text:
        return "ai_native"
    if any(term in text for term in AI_TERMS):
        return "ai_enabled"
    return "none"


def stage_preferences(profile: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        item
        for item in as_list(profile.get("stage_preferences"))
        if isinstance(item, dict)
    ]


def best_stage_preference(
    profile: dict[str, Any],
    stage: str,
) -> tuple[dict[str, Any] | None, str]:
    prefs = stage_preferences(profile)
    if not prefs:
        return None, "none"
    if not stage:
        prefs.sort(key=lambda item: int(item.get("deals_count") or 0), reverse=True)
        return prefs[0], "unknown_founder_stage"

    exact = [pref for pref in prefs if normalize_stage(pref.get("stage")) == stage]
    if exact:
        exact.sort(key=lambda item: int(item.get("deals_count") or 0), reverse=True)
        return exact[0], "exact"

    return None, "stage_mismatch"


def weighted_distribution(pref: dict[str, Any], dimension: str) -> dict[str, float]:
    distributions = pref.get("dimension_distributions") or {}
    if not isinstance(distributions, dict):
        return {}
    dimension_data = distributions.get(dimension) or {}
    if not isinstance(dimension_data, dict):
        return {}
    weighted = dimension_data.get("weighted") or {}
    if not isinstance(weighted, dict):
        return {}
    return {str(key): to_float(value) for key, value in weighted.items()}


def max_distribution_weight(
    pref: dict[str, Any],
    dimension: str,
    values: list[str],
) -> float:
    distribution = weighted_distribution(pref, dimension)
    best = 0.0
    normalized_values = {norm_phrase(value) for value in values}
    for key, weight in distribution.items():
        normalized_key = norm_phrase(key)
        if normalized_key in normalized_values:
            best = max(best, weight)
    return best


def overlap(left: list[Any], right: list[Any]) -> list[str]:
    normalized_right = {norm_phrase(value): str(value) for value in right if value}
    matches = []
    for item in left:
        key = norm_phrase(item)
        if key in normalized_right:
            matches.append(normalized_right[key])
    return matches


def evidence_from_stage_preference(
    pref: dict[str, Any] | None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    if not pref:
        return []
    evidence_refs = [
        item for item in as_list(pref.get("evidence_refs")) if isinstance(item, dict)
    ]
    evidence_refs.sort(key=lambda item: str(item.get("date") or ""), reverse=True)
    chunks = []
    for item in evidence_refs[:limit]:
        company = item.get("company") or "Unknown company"
        stage = item.get("stage") or item.get("raw_stage") or "unknown stage"
        role = item.get("role") or "unknown role"
        amount = item.get("amount_usd")
        amount_text = (
            f"US${to_float(amount):,.0f}"
            if amount is not None
            else "amount undisclosed"
        )
        sectors = ", ".join(as_list(item.get("actual_sector"))[:3])
        themes = ", ".join(as_list(item.get("actual_themes"))[:3])
        chunks.append(
            {
                "section_key": "observed_deal_evidence",
                "entity_type": "investor",
                "entity_id": item.get("deal_key"),
                "confidence": pref.get("data_quality") or "medium",
                "review_needed": False,
                "chunk_text": (
                    f"{company} ({stage}, {amount_text}, {role}, "
                    f"{item.get('date') or 'date unknown'}). "
                    f"Observed sectors: {sectors or 'not classified'}; "
                    f"themes: {themes or 'not classified'}."
                ),
                "source_urls": (
                    [item.get("source_url")] if item.get("source_url") else []
                ),
                "metadata": {
                    "stage": stage,
                    "role": role,
                    "company": company,
                    "date": item.get("date"),
                    "actual_sector": item.get("actual_sector") or [],
                    "actual_themes": item.get("actual_themes") or [],
                },
            }
        )
    return chunks


def fallback_stage_preferences(row: dict[str, Any]) -> list[dict[str, Any]]:
    stages = [normalize_stage(stage) for stage in as_list(row.get("stage_focus"))]
    sectors = [str(item) for item in as_list(row.get("sector_focus")) if item]
    themes = [str(item) for item in as_list(row.get("business_model_focus")) if item]
    if not stages:
        return []

    sector_weight = 1 / len(sectors) if sectors else 0
    theme_weight = 1 / len(themes) if themes else 0
    business_weight = 1 / len(themes) if themes else 0
    return [
        {
            "stage": stage,
            "deals_count": 1,
            "lead_count": 1 if "lead" in norm(row.get("lead_behavior")) else 0,
            "participant_count": 0,
            "leads_at_this_stage": "lead" in norm(row.get("lead_behavior")),
            "cheque_size_min_usd": None,
            "cheque_size_max_usd": None,
            "recent_activity_score": 0.5,
            "actual_sector": sectors,
            "actual_themes": themes,
            "dimension_distributions": {
                "geography": {
                    "weighted": {
                        str(value): 1
                        for value in as_list(row.get("geography_focus"))
                        if value
                    }
                },
                "actual_sector": {
                    "weighted": {value: sector_weight for value in sectors}
                },
                "actual_themes": {
                    "weighted": {value: theme_weight for value in themes}
                },
                "customer_type": {"weighted": {"enterprise": 1}},
                "business_model": {
                    "weighted": {value: business_weight for value in themes}
                },
                "ai_relevance": {"weighted": {row.get("ai_appetite") or "none": 1}},
            },
            "data_quality": row.get("screening_priority") or "medium",
            "matching_notes": row.get("screening_notes"),
            "evidence_refs": [],
        }
        for stage in stages
    ]


def database_row_to_profile(row: dict[str, Any]) -> dict[str, Any]:
    geography_focus = row.get("geography_focus") or []
    preferences = row.get("stage_preferences") or fallback_stage_preferences(row)
    return {
        "investor_id": row.get("slug") or row.get("id"),
        "investor_uuid": str(row.get("id")),
        "investor_name": row.get("name"),
        "investor_type": row.get("investor_type"),
        "hq_country": row.get("hq_country"),
        "hq_state": row.get("hq_state"),
        "hq_city": row.get("hq_city"),
        "local_au_anz_fund": any(is_anz_market(value) for value in geography_focus)
        or is_anz_market(row.get("hq_country")),
        "supported_stages": row.get("stage_focus") or [],
        "first_cheque_stages": row.get("stage_focus") or [],
        "supported_sectors": row.get("sector_focus") or [],
        "supported_themes": row.get("business_model_focus") or [],
        "supported_business_models": row.get("business_model_focus") or [],
        "geography_focus": geography_focus,
        "cheque_ranges": row.get("cheque_ranges") or [],
        "lead_behavior": row.get("lead_behavior"),
        "ai_appetite": row.get("ai_appetite"),
        "recent_deals": row.get("recent_deals") or [],
        "stage_preferences": preferences,
        "total_deals_used": row.get("total_deals_used") or 0,
        "lead_ratio": to_float(row.get("lead_ratio")),
        "overall_confidence": to_float(row.get("overall_confidence")),
        "data_quality": row.get("data_quality") or row.get("screening_priority"),
        "activity_summary": row.get("activity_summary"),
        "review_needed_fields": [],
        "screening_status": row.get("screening_status"),
        "screening_priority": row.get("screening_priority"),
        "screening_notes": row.get("screening_notes"),
    }


def database_chunks(profile: dict[str, Any]) -> list[dict[str, Any]]:
    pref, _ = best_stage_preference(profile, "")
    return evidence_from_stage_preference(pref)


def investor_routing_pool(profile: dict[str, Any]) -> str:
    investor_type = norm_phrase(profile.get("investor_type"))
    if "angel" in investor_type:
        return ANGEL_GROUP_POOL
    if "syndicate" in investor_type:
        return SYNDICATE_POOL
    if any(
        term in investor_type
        for term in ("accelerator", "ecosystem", "government", "other")
    ):
        return PLATFORM_ROUTING_POOL
    if "vc" in investor_type or "fund" in investor_type or "corporate" in investor_type:
        return DIRECT_VC_POOL
    return WATCHLIST_POOL


def eligibility_check(
    founder: dict[str, Any],
    profile: dict[str, Any],
    stage_match: str,
) -> dict[str, Any]:
    hard_filter_reasons: list[str] = []
    soft_warnings: list[str] = []
    passed = True

    if founder_is_anz(founder):
        if profile_has_anz_mandate(profile):
            hard_filter_reasons.append(
                "Geography eligible: observed AU/ANZ deal evidence."
            )
        elif profile_has_global_mandate(profile):
            hard_filter_reasons.append("Geography eligible: global mandate.")
        else:
            passed = False
            hard_filter_reasons.append("Geography blocked: no observed AU/ANZ fit.")

    stage = normalize_stage(founder.get("stage") or founder.get("round_type"))
    if stage and stage_match != "exact":
        passed = False
        hard_filter_reasons.append(
            "Stage blocked: no observed same-stage investment evidence."
        )
    elif stage_match == "exact":
        hard_filter_reasons.append("Stage eligible: observed same-stage deals.")
    elif not stage:
        soft_warnings.append(
            "Stage is missing, so strict stage filtering was not applied."
        )

    return {
        "passed": passed,
        "hard_filter_reasons": hard_filter_reasons,
        "soft_warnings": soft_warnings,
    }


def score_stage_evidence_depth(pref: dict[str, Any] | None) -> int:
    if not pref:
        return 0

    deals_count = int(pref.get("deals_count") or 0)
    lead_count = int(pref.get("lead_count") or 0)
    data_quality = norm(pref.get("data_quality"))

    score = min(6, deals_count * 2)
    score += min(2, lead_count or (2 if pref.get("leads_at_this_stage") else 0))
    score += {"high": 2, "medium": 1, "low": 0}.get(data_quality, 1)
    return min(score, 10)


def score_geography(founder: dict[str, Any], profile: dict[str, Any]) -> int:
    if founder_is_anz(founder):
        if profile_has_anz_mandate(profile):
            return 5
        if profile_has_global_mandate(profile):
            return 3
        return 0
    if profile_has_global_mandate(profile):
        return 5
    if profile_has_anz_mandate(profile):
        return 3
    return 2


def score_sector_fit(
    founder_taxonomy: dict[str, list[str]],
    pref: dict[str, Any] | None,
    profile: dict[str, Any],
) -> tuple[int, list[str]]:
    founder_sectors = founder_taxonomy["actual_sector"]
    if not founder_sectors:
        return 0, []

    stage_sectors = (
        [str(item) for item in as_list(pref.get("actual_sector"))] if pref else []
    )
    sector_matches = overlap(founder_sectors, stage_sectors)
    if sector_matches:
        weight = max_distribution_weight(pref or {}, "actual_sector", sector_matches)
        score = 12 + round(weight * 7) + min(2, len(sector_matches) - 1)
        return min(20, score), sector_matches

    profile_matches = overlap(founder_sectors, profile.get("supported_sectors") or [])
    if profile_matches:
        return 11, profile_matches

    if "enterprise_software_data_security" in stage_sectors and any(
        sector in founder_sectors
        for sector in ("enterprise_software_data_security", "property_construction")
    ):
        return 6, ["broad enterprise software adjacency"]

    return 0, []


def score_theme_fit(
    founder_taxonomy: dict[str, list[str]],
    pref: dict[str, Any] | None,
    profile: dict[str, Any],
    *,
    theme_prevalence: dict[str, int] | None = None,
) -> tuple[int, list[str], dict[str, Any]]:
    primary_themes = [
        str(item)
        for item in as_list(founder_taxonomy.get("primary_themes"))
        if str(item).strip()
    ]
    secondary_themes = [
        str(item)
        for item in as_list(founder_taxonomy.get("secondary_themes"))
        if str(item).strip()
    ]
    founder_themes = list(
        dict.fromkeys(
            primary_themes
            + secondary_themes
            + [str(item) for item in founder_taxonomy.get("actual_themes", [])]
        )
    )
    meta: dict[str, Any] = {
        "evidence_status": "no_founder_themes",
        "match_type": None,
        "related_strength": 0.0,
        "sparse_founder_themes": False,
    }
    if not founder_themes:
        return 0, [], meta

    prevalence = theme_prevalence or {}
    # Sparse check is driven by primary theme when present.
    sparse_basis = primary_themes or founder_themes
    sparse_founder_themes = all(
        prevalence.get(theme, 0) < SPARSE_THEME_PREF_THRESHOLD for theme in sparse_basis
    )
    meta["sparse_founder_themes"] = sparse_founder_themes

    stage_themes = (
        [str(item) for item in as_list(pref.get("actual_themes"))] if pref else []
    )
    theme_matches = overlap(founder_themes, stage_themes)
    if theme_matches:
        weight = max_distribution_weight(pref or {}, "actual_themes", theme_matches)
        score = 12 + round(weight * 6) + min(2, len(theme_matches) - 1)
        if overlap(primary_themes, theme_matches):
            score += 2
        meta["evidence_status"] = "exact_match"
        meta["match_type"] = "exact"
        return min(20, score), theme_matches, meta

    profile_matches = overlap(founder_themes, profile.get("supported_themes") or [])
    if profile_matches:
        meta["evidence_status"] = "exact_match"
        meta["match_type"] = "profile_supported"
        return 10, profile_matches, meta

    supported_themes = [str(item) for item in as_list(profile.get("supported_themes"))]
    # Prefer matching primary themes first for relatedness.
    related_basis = primary_themes + [
        theme for theme in founder_themes if theme not in primary_themes
    ]
    related_strength, founder_theme, investor_theme = best_related_theme_match(
        related_basis,
        stage_themes or supported_themes,
    )
    if related_strength >= 0.55 and founder_theme and investor_theme:
        score = max(7, round(20 * related_strength * 0.7))
        if founder_theme in primary_themes:
            score += 1
        meta["evidence_status"] = "related_match"
        meta["match_type"] = "related"
        meta["related_strength"] = related_strength
        return min(15, score), [f"{founder_theme}->{investor_theme}"], meta

    if related_strength >= 0.35 and founder_theme and investor_theme:
        score = max(4, round(20 * related_strength * 0.55))
        meta["evidence_status"] = "related_match"
        meta["match_type"] = "weak_related"
        meta["related_strength"] = related_strength
        return min(10, score), [f"{founder_theme}->{investor_theme}"], meta

    # Tiny same-sector fallback; avoid double-counting sector_fit.
    founder_sectors = {
        THEME_TO_SECTOR.get(theme)
        for theme in founder_themes
        if THEME_TO_SECTOR.get(theme)
    }
    investor_sectors = {
        THEME_TO_SECTOR.get(str(theme))
        for theme in stage_themes
        if THEME_TO_SECTOR.get(str(theme))
    }
    if founder_sectors and founder_sectors & investor_sectors:
        meta["evidence_status"] = "sector_only_support"
        meta["match_type"] = "sector_only"
        return 3, ["sector_only_support"], meta

    if sparse_founder_themes:
        # Sparse legal themes without hits are unknown evidence, not strong mismatch.
        meta["evidence_status"] = "sparse_evidence"
        meta["match_type"] = None
        return 0, [], meta

    meta["evidence_status"] = "mismatch"
    return 0, [], meta


def parsed_year(value: Any) -> int | None:
    if isinstance(value, (datetime, date)):
        return value.year
    text = str(value or "").strip()
    if len(text) >= 4 and text[:4].isdigit():
        return int(text[:4])
    try:
        return datetime.fromisoformat(text).year
    except ValueError:
        return None


def recency_points(value: Any) -> int:
    year = parsed_year(value)
    if year is None:
        return 0
    current_year = date.today().year
    if year >= current_year:
        return 3
    if year >= current_year - 1:
        return 2
    if year >= current_year - 2:
        return 1
    return 0


def score_recent_deal_similarity(
    founder_taxonomy: dict[str, list[str]],
    pref: dict[str, Any] | None,
    sector_matches: list[str],
    theme_matches: list[str],
) -> tuple[int, list[str]]:
    if not pref:
        return 0, []

    founder_sectors = founder_taxonomy["actual_sector"]
    founder_themes = founder_taxonomy["actual_themes"]
    comparable_deals: list[str] = []
    best_deal_score = 0

    for item in as_list(pref.get("evidence_refs")):
        if not isinstance(item, dict):
            continue
        deal_theme_matches = overlap(founder_themes, as_list(item.get("actual_themes")))
        deal_sector_matches = overlap(
            founder_sectors, as_list(item.get("actual_sector"))
        )
        if not deal_theme_matches and not deal_sector_matches:
            continue

        deal_score = 3
        if deal_theme_matches:
            deal_score += 11 + min(3, len(deal_theme_matches) - 1)
        if deal_sector_matches:
            deal_score += 5
        if "lead" in norm_phrase(item.get("role")):
            deal_score += 2
        elif item.get("role"):
            deal_score += 1
        deal_score += recency_points(item.get("date"))
        best_deal_score = max(best_deal_score, min(deal_score, 25))
        if item.get("company"):
            comparable_deals.append(str(item["company"]))

    if comparable_deals:
        score = best_deal_score + min(3, len(comparable_deals) - 1)
        return min(score, 25), comparable_deals[:3]

    deals_count = int(pref.get("deals_count") or 0)
    recency = to_float(pref.get("recent_activity_score"))
    score = 0
    if theme_matches:
        score += 10
    elif sector_matches:
        score += 6
    score += min(5, deals_count)
    score += min(4, round(recency * 4))
    return min(score, 25), []


def score_customer_icp(founder: dict[str, Any], pref: dict[str, Any] | None) -> int:
    if not pref:
        return 0
    customer_type = founder_customer_type(founder)
    business_model = founder_business_model(founder)
    score = 0
    if customer_type:
        customer_weight = max_distribution_weight(
            pref, "customer_type", [customer_type]
        )
        if customer_weight:
            score += 3 + round(customer_weight)
    if business_model:
        model_weight = max_distribution_weight(pref, "business_model", [business_model])
        if model_weight:
            score += 1 + round(model_weight)
    return min(score, 5)


def founder_raise_usd_estimate(founder: dict[str, Any]) -> float | None:
    value = to_float(founder.get("target_raise_value"))
    if value <= 0:
        return None

    unit = norm_phrase(founder.get("target_raise_unit"))
    multiplier = 1.0
    if unit in {"m", "mn", "mm", "million", "millions", "mio"}:
        multiplier = 1_000_000
    elif unit in {"k", "thousand", "thousands"}:
        multiplier = 1_000
    elif not unit and value < 1000:
        multiplier = 1_000_000

    currency = norm_phrase(founder.get("target_raise_currency"))
    fx_to_usd = {
        "usd": 1.0,
        "us$": 1.0,
        "aud": 0.66,
        "a$": 0.66,
        "nzd": 0.60,
        "nz$": 0.60,
    }
    return value * multiplier * fx_to_usd.get(currency, 1.0)


def score_cheque_size_fit(founder: dict[str, Any], pref: dict[str, Any] | None) -> int:
    amount_usd = founder_raise_usd_estimate(founder)
    if amount_usd is None:
        return 2
    if not pref:
        return 0

    min_usd = to_float(pref.get("cheque_size_min_usd"), default=0)
    max_usd = to_float(pref.get("cheque_size_max_usd"), default=0)
    if min_usd <= 0 and max_usd <= 0:
        return 2

    lower_bound = min_usd if min_usd > 0 else 0
    upper_bound = max_usd if max_usd > 0 else float("inf")
    if lower_bound <= amount_usd <= upper_bound:
        return 5

    soft_lower = lower_bound * 0.6 if lower_bound > 0 else 0
    soft_upper = upper_bound * 1.4 if upper_bound != float("inf") else float("inf")
    if soft_lower <= amount_usd <= soft_upper:
        return 3
    return 1


def score_lead_behavior_fit(
    founder: dict[str, Any], pref: dict[str, Any] | None
) -> int:
    if not pref:
        return 2

    lead_needed = founder.get("lead_needed")
    lead_count = int(pref.get("lead_count") or 0)
    participant_count = int(pref.get("participant_count") or 0)
    leads_at_stage = bool(pref.get("leads_at_this_stage")) or lead_count > 0

    if lead_needed is True:
        if leads_at_stage:
            return 5
        if participant_count > 0:
            return 1
        return 0
    if lead_needed is False:
        if participant_count > 0:
            return 5
        if leads_at_stage:
            return 4
        return 2
    return 2


def score_data_quality_recency(
    pref: dict[str, Any] | None,
    profile: dict[str, Any],
) -> int:
    if not pref:
        return min(5, round(to_float(profile.get("overall_confidence")) * 5))

    data_quality = norm(pref.get("data_quality") or profile.get("data_quality"))
    recency = to_float(pref.get("recent_activity_score"))
    score = {"high": 2, "medium": 1, "low": 0}.get(data_quality, 1)
    score += min(3, round(recency * 3))
    return min(score, 5)


def score_tier(score: int) -> str:
    # Slightly lower absolute thresholds for evidence-sparse formal matching.
    if score >= 75:
        return "strong"
    if score >= 60:
        return "good"
    if score >= 42:
        return "possible"
    return "manual_review"


def build_theme_prevalence(profiles: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for profile in profiles:
        for pref in stage_preferences(profile):
            for theme in as_list(pref.get("actual_themes")):
                key = str(theme)
                counts[key] = counts.get(key, 0) + 1
    return counts


def score_profile(
    founder: dict[str, Any],
    profile: dict[str, Any],
    *,
    theme_prevalence: dict[str, int] | None = None,
) -> dict[str, Any]:
    stage = normalize_stage(founder.get("stage") or founder.get("round_type"))
    pref, stage_match = best_stage_preference(profile, stage)
    founder_taxonomy = infer_founder_taxonomy(founder)
    routing_pool = investor_routing_pool(profile)
    breakdown = {key: 0 for key in MATCHING_WEIGHTS}
    strengths: list[str] = []
    risks: list[str] = []
    missing_evidence: list[str] = []

    breakdown["stage_evidence_depth"] = score_stage_evidence_depth(pref)
    breakdown["geography_fit"] = score_geography(founder, profile)
    sector_score, sector_matches = score_sector_fit(founder_taxonomy, pref, profile)
    theme_score, theme_matches, theme_meta = score_theme_fit(
        founder_taxonomy,
        pref,
        profile,
        theme_prevalence=theme_prevalence,
    )
    breakdown["sector_fit"] = sector_score
    breakdown["theme_fit"] = theme_score
    recent_score, comparable_deals = score_recent_deal_similarity(
        founder_taxonomy,
        pref,
        sector_matches,
        [
            item.split("->", 1)[0] if "->" in item else item
            for item in theme_matches
            if item != "sector_only_support"
        ],
    )
    breakdown["recent_deal_similarity"] = recent_score
    breakdown["customer_icp_fit"] = score_customer_icp(founder, pref)
    breakdown["cheque_size_fit"] = score_cheque_size_fit(founder, pref)
    breakdown["lead_behavior_fit"] = score_lead_behavior_fit(founder, pref)
    breakdown["data_quality_recency"] = score_data_quality_recency(pref, profile)

    if stage_match == "exact":
        strengths.append(f"Observed same-stage activity at {stage.replace('_', ' ')}.")
    elif stage_match == "unknown_founder_stage":
        risks.append("Founder stage is missing, so same-stage evidence is unconfirmed.")
    else:
        risks.append("No observed same-stage investment activity.")

    if profile_has_anz_mandate(profile):
        strengths.append("Observed AU/ANZ geography fit.")
    elif founder_is_anz(founder):
        risks.append("No clear AU/ANZ geography evidence.")

    theme_status = theme_meta.get("evidence_status")
    if theme_meta.get("match_type") == "exact":
        strengths.append(
            "Specific theme overlap: " + ", ".join(theme_matches[:3]) + "."
        )
    elif theme_meta.get("match_type") in {"related", "weak_related"}:
        strengths.append("Related theme support: " + ", ".join(theme_matches[:3]) + ".")
    elif theme_status == "sector_only_support":
        risks.append("Only same-sector theme support; no specific theme overlap.")
        missing_evidence.append("theme_specific")
    elif theme_status == "sparse_evidence":
        risks.append(
            "Founder theme evidence is sparse in the investor database; "
            "theme non-match is treated as unknown rather than hard mismatch."
        )
        missing_evidence.append("theme_coverage")
    elif founder_taxonomy["actual_themes"]:
        risks.append("No specific second-level theme overlap in observed deals.")

    if sector_matches:
        strengths.append("Sector overlap: " + ", ".join(sector_matches[:3]) + ".")
    else:
        risks.append("No close first-level sector overlap.")

    if comparable_deals:
        strengths.append(
            "Comparable recent deals include " + ", ".join(comparable_deals[:3]) + "."
        )
    elif breakdown["recent_deal_similarity"] < 10:
        risks.append("Recent comparable deal evidence is thin.")

    if breakdown["customer_icp_fit"] >= 4:
        strengths.append("Customer type or business model matches observed deals.")
    elif breakdown["customer_icp_fit"] == 0:
        risks.append("Customer/ICP fit is thin in observed data.")
        missing_evidence.append("customer_icp")

    if breakdown["cheque_size_fit"] >= 4:
        strengths.append("Raise size appears within observed cheque range.")
    elif breakdown["cheque_size_fit"] <= 1:
        risks.append("Raise size appears outside observed cheque range.")

    if founder.get("lead_needed") is True and breakdown["lead_behavior_fit"] >= 4:
        strengths.append("Observed lead behaviour fits a founder seeking a lead.")
    elif founder.get("lead_needed") is True and breakdown["lead_behavior_fit"] <= 1:
        risks.append("Lead evidence is weak for this stage.")
        missing_evidence.append("lead_behaviour")

    if pref and int(pref.get("deals_count") or 0) > 0:
        strengths.append(
            f"{pref.get('deals_count')} observed {pref.get('stage')} deal(s) "
            "support this score."
        )

    founder_ai = founder_ai_relevance(founder)
    if founder_ai != "none":
        ai_weight = max_distribution_weight(pref or {}, "ai_relevance", [founder_ai])
        if ai_weight:
            strengths.append(f"AI relevance aligns as {founder_ai}.")
        else:
            risks.append(
                "AI is treated as a modifier; observed AI evidence is not strong."
            )

    # Sparse theme non-matches should not consume the full 25-point denominator.
    assessable_weights = dict(MATCHING_WEIGHTS)
    if theme_status == "sparse_evidence":
        assessable_weights["theme_fit"] = 0

    raw_score = min(sum(int(value) for value in breakdown.values()), 100)
    assessable_points = sum(assessable_weights.values())
    earned_assessable = sum(
        int(breakdown[key]) for key, weight in assessable_weights.items() if weight > 0
    )
    if assessable_points > 0:
        normalized_score = min(100, round(earned_assessable / assessable_points * 100))
    else:
        normalized_score = raw_score

    # Prefer normalized score for ranking when sparse evidence would otherwise
    # systematically depress otherwise-strong matches.
    score = normalized_score if theme_status == "sparse_evidence" else raw_score

    core_missing = 0
    if breakdown["sector_fit"] == 0:
        core_missing += 1
    if breakdown["stage_evidence_depth"] == 0:
        core_missing += 1
    if breakdown["geography_fit"] == 0:
        core_missing += 1
    if theme_status == "sparse_evidence" or len(missing_evidence) >= 2:
        confidence = "low" if core_missing >= 1 else "medium"
    elif core_missing >= 2:
        confidence = "low"
    elif core_missing == 1 or missing_evidence:
        confidence = "medium"
    else:
        confidence = "high"

    eligibility = eligibility_check(founder, profile, stage_match)
    evidence = evidence_from_stage_preference(pref)

    return {
        "investor_id": profile.get("investor_id"),
        "investor_name": profile.get("investor_name"),
        "score": score,
        "raw_score": raw_score,
        "normalized_score": normalized_score,
        "assessable_points": assessable_points,
        "confidence": confidence,
        "missing_evidence": missing_evidence,
        "theme_evidence": theme_meta,
        "match_tier": score_tier(score),
        "routing_pool": routing_pool,
        "routing_pool_label": ROUTING_POOL_LABELS[routing_pool],
        "pool_rank": None,
        "eligibility": eligibility,
        "breakdown": breakdown,
        "strengths": strengths,
        "risks": risks,
        "review_needed_fields": profile.get("review_needed_fields", []),
        "evidence": evidence,
    }


def select_ranked_matches(
    results: list[dict[str, Any]],
    *,
    limit: int = DEFAULT_MATCH_RESULT_LIMIT,
) -> list[dict[str, Any]]:
    eligible = [
        result
        for result in results
        if result.get("eligibility", {}).get("passed", True)
    ]
    selected = sorted(
        eligible,
        key=lambda item: (
            -int(item.get("score") or 0),
            str(item.get("investor_name") or ""),
        ),
    )[:limit]
    for index, item in enumerate(selected, start=1):
        item["rank"] = index
        item["pool_rank"] = None
    return selected[:limit]


def select_evidence(
    founder: dict[str, Any],
    chunks: list[dict[str, Any]],
    limit: int = 5,
) -> list[dict[str, Any]]:
    keywords = [
        *infer_founder_taxonomy(founder)["actual_sector"],
        *infer_founder_taxonomy(founder)["actual_themes"],
        founder.get("stage"),
    ]
    scored = []
    for item in chunks:
        text = norm_phrase(item.get("chunk_text"))
        score = sum(
            1 for keyword in keywords if keyword and norm_phrase(keyword) in text
        )
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [item for _, item in scored[:limit]]


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

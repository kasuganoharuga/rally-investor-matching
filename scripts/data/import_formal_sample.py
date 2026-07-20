"""Build a formal-schema sample database from recent deal envelopes.

This is intentionally a sample/import-lab tool, not production migration code.
It lets us inspect how the new evidence package behaves once loaded into the
formal schema and derived into:

- investor_actual_preferences
- investor_actual_stage_preferences

Example:
  python scripts/data/import_formal_sample.py ^
    --recreate-database ^
    --source-dir "C:\\Users\\49765\\Desktop\\Internship\\Week5 7-14\\recent-deal2026-7-16_deals-001-060_filtered" ^
    --source-dir "C:\\Users\\49765\\Desktop\\Internship\\Week5 7-14\\recent-deal2026-7-16_deals-061-120_filtered"
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from psycopg import Connection, connect, sql
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

DEFAULT_DATABASE_URL = (
    "postgresql://rally:rally_dev_password@localhost:5432/rally_formal_sample"
)
DEFAULT_ADMIN_URL = "postgresql://rally:rally_dev_password@localhost:5432/postgres"
DEFAULT_SCHEMA_FILE = Path("data/schemas/vc_matching_schema_aws_with_mvp_compat.sql")
DEFAULT_PATCH_FILE = Path("data/patches/202607_formal_sample_import_extensions.sql")
DEFAULT_SUMMARY_FILE = Path("data/generated/formal_sample_import_summary.json")
PIPELINE_VERSION = "formal-sample-2026-07-18-v6"

CORE_STAGE_VALUES = {
    "pre_seed",
    "seed",
    "series_a",
    "series_b",
    "series_c_plus",
    "growth",
    "bridge",
}

TAXONOMY_LAYER_1 = [
    {
        "display_name": "Healthcare / Life Sciences",
        "code": "healthcare_life_sciences",
    },
    {
        "display_name": "Mining / Resources / Metals",
        "code": "resources_mining_metals",
    },
    {"display_name": "Energy / Climate", "code": "energy_climate"},
    {
        "display_name": "Aerospace / Space / Defence",
        "code": "aerospace_space_defence",
    },
    {
        "display_name": "Fintech / Financial Services",
        "code": "fintech_financial_services",
    },
    {
        "display_name": "Enterprise Software / Data / Security",
        "code": "enterprise_software_data_security",
    },
    {"display_name": "Education / Workforce", "code": "education_workforce"},
    {
        "display_name": "Industrial Robotics / Automation",
        "code": "industrial_robotics_automation",
    },
    {"display_name": "Food / Agriculture", "code": "food_agriculture"},
    {
        "display_name": "Transport / Logistics / Infrastructure",
        "code": "transport_logistics_infrastructure",
    },
    {"display_name": "Property / Construction", "code": "property_construction"},
    {"display_name": "Consumer / Marketplace", "code": "consumer_marketplace"},
]

ACTUAL_SECTORS = {item["code"] for item in TAXONOMY_LAYER_1}

ALLOWED_INVESTOR_TYPES = {
    "vc_fund",
    "angel",
    "angel_group",
    "family_office",
    "corporate_vc",
    "accelerator",
    "government_fund",
    "other",
}

ALLOWED_REVIEW_STATUS = {
    "unreviewed",
    "approved",
    "corrected",
    "rejected",
    "needs_more_data",
}

ALLOWED_SOURCE_PROVIDERS = {
    "crunchbase",
    "pitchbook",
    "dealroom",
    "announcement",
    "manual",
    "other",
}
ALLOWED_CONFIDENCE = {"high", "medium", "low"}
ALLOWED_DEAL_ROLES = {"lead", "co_lead", "participant", "undisclosed", "unknown"}
ALLOWED_PARTICIPATION = {"new_investor", "existing_investor", "follow_on", "unknown"}
ALLOWED_RESOLUTION = {"unresolved", "resolved", "ambiguous", "not_an_investor"}


@dataclass
class ImportState:
    record_ids: dict[str, str]
    records: dict[str, dict[str, dict[str, Any]]]
    skipped: Counter[str]
    manual_review_items: list[dict[str, Any]]


def load_envelopes(source_dir: Path, folder: str) -> list[dict[str, Any]]:
    records = []
    for path in sorted((source_dir / folder).glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
        payload["_path"] = str(path)
        records.append(payload)
    return records


def load_envelopes_many(
    source_dirs: list[Path],
    folder: str,
    state: ImportState,
) -> list[dict[str, Any]]:
    """Load envelopes from multiple packages, keeping the last record_key.

    Later packages represent newer evidence in this sample workflow. Duplicate
    identity records are merged by record_key, while distinct deals still append.
    """

    records_by_key: dict[str, dict[str, Any]] = {}
    for source_dir in source_dirs:
        for envelope in load_envelopes(source_dir, folder):
            record_key = envelope.get("record_key")
            if record_key in records_by_key:
                state.skipped[f"{folder}_duplicate_record_key_replaced"] += 1
            records_by_key[str(record_key)] = envelope
    return list(records_by_key.values())


def parse_db_name(database_url: str) -> str:
    parsed = urlparse(database_url)
    db_name = parsed.path.lstrip("/")
    if not db_name:
        raise ValueError("Database URL must include a database name")
    return db_name


def recreate_database(admin_url: str, database_url: str) -> None:
    db_name = parse_db_name(database_url)
    with connect(admin_url, autocommit=True) as connection:
        connection.execute(
            """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = %s AND pid <> pg_backend_pid()
            """,
            (db_name,),
        )
        connection.execute(
            sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(db_name))
        )
        connection.execute(
            sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name))
        )


def apply_sql_file(connection: Connection, path: Path) -> None:
    connection.execute(path.read_text(encoding="utf-8"))
    connection.commit()


def use_public_schema(connection: Connection) -> None:
    connection.execute("SET search_path TO public")
    connection.commit()


def as_jsonb(value: Any) -> Jsonb:
    return Jsonb(value if value is not None else {})


def as_jsonb_array(value: Any) -> Jsonb:
    return Jsonb(value if isinstance(value, list) else [])


def one_of(value: Any, allowed: set[str], default: str) -> str:
    text = str(value or "").strip().lower()
    return text if text in allowed else default


def as_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    text = str(value)
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return date.fromisoformat(text[:10])
        except ValueError:
            return None


def as_datetime_text(value: Any) -> str | None:
    if value in (None, ""):
        return None
    return str(value)


def normalize_currency(value: Any) -> str | None:
    if not value:
        return None
    text = str(value).strip().upper()
    return text[:3] if len(text) >= 3 else None


def normalize_identity_url(value: Any) -> str | None:
    if not value:
        return None
    text = str(value).strip()
    return text.rstrip("/") or None


def normalize_review_status(value: Any) -> str:
    return one_of(value, ALLOWED_REVIEW_STATUS, "unreviewed")


def normalize_confidence(value: Any, default: str = "medium") -> str:
    return one_of(value, ALLOWED_CONFIDENCE, default)


def normalize_source_provider(value: Any) -> str:
    return one_of(value, ALLOWED_SOURCE_PROVIDERS, "other")


def normalize_investor_type(value: Any) -> str:
    text = str(value or "").strip().lower()
    if text in ALLOWED_INVESTOR_TYPES:
        return text
    if text == "strategic_corporate":
        return "corporate_vc"
    if text == "university_fund":
        return "government_fund"
    return "other"


def normalize_stage(value: Any) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    mapping = {
        "preseed": "pre_seed",
        "pre_seed": "pre_seed",
        "seed": "seed",
        "series_a": "series_a",
        "series_b": "series_b",
        "series_c": "series_c_plus",
        "series_d": "series_c_plus",
        "series_e": "series_c_plus",
        "series_f": "series_c_plus",
        "series_c_plus": "series_c_plus",
        "growth": "growth",
        "bridge": "bridge",
        "convertible_note": "bridge",
    }
    return mapping.get(text, "unknown")


def normalize_customer_type(value: Any) -> str:
    text = str(value or "").lower()
    if not text or text == "none":
        return "unknown"
    if "developer" in text:
        return "developer"
    if "health" in text or "clinical" in text:
        return "healthcare_provider"
    if "government" in text or "b2g" in text:
        return "government"
    if "education" in text or "school" in text or "university" in text:
        return "education_institution"
    if "consumer" in text or "b2c" in text:
        return "consumer"
    if "smb" in text or "small" in text:
        return "smb"
    if "mid" in text:
        return "mid_market"
    if "enterprise" in text or "b2b" in text or "institution" in text:
        return "enterprise"
    return "other"


def normalize_business_model(value: Any) -> str:
    text = str(value or "").lower()
    if not text:
        return "unknown"
    if "subscription" in text or "saas" in text:
        return "subscription_saas"
    if "usage" in text or "consumption" in text:
        return "usage_based"
    if "transaction" in text or "payment" in text:
        return "transaction_fee"
    if "marketplace" in text or "take_rate" in text:
        return "marketplace_take_rate"
    if "licens" in text:
        return "licensing"
    if "hardware" in text or "device" in text:
        return "hardware_sales"
    if "service" in text or "asset_management" in text or "fees" in text:
        return "services"
    if "advertising" in text or "ad" in text:
        return "advertising"
    if "freemium" in text:
        return "freemium"
    if "commerce" in text or "retail" in text:
        return "commerce"
    if text in {"other", "unknown"}:
        return text
    return "other"


def normalize_sales_motion(value: Any) -> str:
    text = str(value or "").lower()
    if not text:
        return "unknown"
    if "product" in text or "plg" in text:
        return "plg"
    if "channel" in text or "partner" in text or "distribution" in text:
        return "channel_partner"
    if "community" in text:
        return "community_led"
    if "self" in text:
        return "self_serve"
    if "enterprise" in text or "top_down" in text:
        return "enterprise_top_down"
    if "sales" in text or "relationship" in text:
        return "sales_led"
    if text in {"other", "unknown"}:
        return text
    return "other"


def normalize_technology_depth(value: Any) -> str:
    text = str(value or "").lower()
    if not text:
        return "unknown"
    if "ai_infrastructure" in text or "model" in text or "gpu" in text:
        return "ai_infrastructure"
    if "applied_ai" in text:
        return "applied_ai"
    if "deep" in text or "research" in text or "biotech" in text:
        return "deep_tech_research"
    if "hardware" in text or "robot" in text or "engineering" in text:
        return "hardware_engineering"
    if "software" in text or "standard" in text or "platform" in text:
        return "conventional_software"
    if text in {"other", "unknown"}:
        return text
    return "other"


def normalize_ai_relevance(value: Any) -> str:
    text = str(value or "").lower()
    if not text:
        return "unknown"
    if text in {"none", "low", "neither", "not_applicable"}:
        return "none"
    if "infra" in text:
        return "ai_infrastructure"
    if "native" in text or "core" in text:
        return "ai_native"
    if "enabled" in text or "medium" in text or "high" in text or "ai" in text:
        return "ai_enabled"
    return "unknown"


def normalize_ai_usage_type(value: Any) -> str:
    text = str(value or "").lower()
    if not text:
        return "unknown"
    if any(key in text for key in ("not_applicable", "none", "not_disclosed")):
        return "not_applicable"
    if "agent" in text or "copilot" in text:
        return "copilot_or_agent"
    if "automation" in text:
        return "automation"
    if any(key in text for key in ("analytics", "prediction", "risk", "scoring")):
        return "analytics_prediction"
    if any(key in text for key in ("content", "generative", "editing")):
        return "content_generation"
    if "data" in text and "infra" in text:
        return "data_infrastructure"
    if any(key in text for key in ("model", "gpu", "cloud", "infrastructure")):
        return "model_infrastructure"
    if "robot" in text or "autonomy" in text or "autonomous" in text:
        return "robotics_autonomy"
    return "unknown"


def normalize_ai_core_or_enabler(value: Any) -> str:
    text = str(value or "").lower()
    if not text:
        return "unclear"
    if "core" in text:
        return "core_product"
    if "enabler" in text or "feature" in text:
        return "feature_layer"
    if "operational" in text:
        return "operational_tool"
    return "unclear"


def slug_tokens(value: Any) -> list[str]:
    if isinstance(value, list):
        return [token for item in value for token in slug_tokens(item)]
    text = str(value or "").lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return [part for part in text.split() if part]


def slugify(value: Any) -> str:
    slug = "-".join(slug_tokens(value))
    return slug or "investor"


def combined_text(*values: Any) -> str:
    tokens = []
    for value in values:
        tokens.extend(slug_tokens(value))
    return " ".join(tokens)


def contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    padded_text = f" {text} "
    tokens = set(text.split())
    prefix_keywords = {
        "agtech",
        "biotech",
        "decarbon",
        "diagnostic",
        "fintech",
        "hypersonic",
        "proptech",
        "renewable",
    }

    for keyword in keywords:
        normalized_keyword = combined_text(keyword)
        if not normalized_keyword:
            continue
        if f" {normalized_keyword} " in padded_text:
            return True
        if normalized_keyword in prefix_keywords and any(
            token.startswith(normalized_keyword) for token in tokens
        ):
            return True
    return False


SECTOR_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "healthcare_life_sciences",
        (
            "health",
            "medical",
            "dental",
            "biotech",
            "biotechnology",
            "biomarker",
            "cell therapy",
            "neuro",
            "respiratory",
            "patient",
            "clinical",
            "chronic",
            "preventive",
            "womens",
            "disease",
            "care",
            "home care",
            "aged care",
            "disability",
            "allied health",
            "detox",
            "recovery",
            "drug delivery",
            "pharmaceutical",
            "nutraceutical",
            "genomics",
            "dna sequencing",
            "accessibility",
            "assistive",
            "deaf",
            "dementia",
            "longevity",
            "functional medicine",
            "wellness",
            "emotional wellness",
            "aromatherapy",
            "digital health infrastructure",
            "orthopaedic",
            "orthopedic",
            "regenerative medicine",
            "animal health",
            "biomanufacturing",
            "biotechnology",
            "fermentation",
            "algae",
            "photobioreactor",
        ),
    ),
    (
        "resources_mining_metals",
        (
            "mining",
            "mineral",
            "natural resources",
            "rare earth",
            "copper",
            "gold",
            "iron ore",
            "lithium",
            "nickel",
            "tungsten",
            "antimony",
            "phosphate",
            "resource",
            "metals",
            "concentrate",
            "drilling",
            "ore",
            "mining workflow",
        ),
    ),
    (
        "aerospace_space_defence",
        (
            "space",
            "aerospace",
            "defence",
            "defense",
            "aviation",
            "aircraft",
            "hypersonic",
            "launch",
            "satellite",
            "reentry",
            "positioning navigation timing",
            "beyond gps",
            "pnt",
            "electric aircraft",
            "aviation compliance",
            "aviation regulatory",
        ),
    ),
    (
        "energy_climate",
        (
            "energy",
            "climate",
            "battery",
            "renewable",
            "wind",
            "solar",
            "decarbon",
            "distributed energy",
            "electricity retail",
            "green steel",
            "hydrogen",
            "carbon to chemicals",
            "circular economy",
            "environmental services",
            "biodiversity",
            "natural capital",
            "nature investment",
            "energy infrastructure",
            "gas infrastructure",
            "single use waste",
            "reusable cup",
            "biomaterial",
            "biomaterials",
            "microbial cellulose",
            "organic waste",
            "methane",
            "fuel",
            "waste to energy",
            "clean energy",
            "power generation",
            "sustainable aviation fuel",
            "zero emissions",
            "ammonia",
            "nitric acid",
            "fertiliser",
            "fertilizer",
            "electric aircraft",
            "aviation energy",
        ),
    ),
    (
        "fintech_financial_services",
        (
            "fintech",
            "financial",
            "finance",
            "payments",
            "payment",
            "stablecoin",
            "neobank",
            "credit",
            "insurance",
            "wealth",
            "home loan",
            "embedded finance",
            "working capital",
            "banking",
            "blockchain",
            "onchain",
            "crypto",
            "fund administration",
            "private market",
            "financial adviser",
            "financial advisor",
            "personal finance",
            "money tools",
            "trading infrastructure",
            "bitcoin",
            "public market investment",
            "investing platform",
            "crowdfunding",
            "crowd sourced equity",
            "equity funding",
            "consumer lending",
            "retail finance",
            "harmful spending",
            "due diligence",
        ),
    ),
    (
        "industrial_robotics_automation",
        (
            "robotics",
            "robotic",
            "autonomous",
            "mapping",
            "industrial",
            "manufacturing",
            "advanced manufacturing",
            "storage equipment",
            "metal forming",
            "computer vision",
            "automation",
            "automotive parts",
            "autonomous systems",
            "positioning navigation",
            "navigation",
            "fleet maintenance",
            "fleet management",
            "equipment hire",
            "field service",
            "photobioreactor",
            "fermentation",
        ),
    ),
    (
        "education_workforce",
        (
            "education technology",
            "edtech",
            "online learning",
            "skills training",
            "career portfolio",
            "proof of work",
            "workforce training",
            "higher education",
            "vocational education",
            "youth entrepreneurship",
            "future skills",
            "teacher",
            "school",
            "curriculum",
        ),
    ),
    (
        "food_agriculture",
        (
            "food",
            "agriculture",
            "agtech",
            "dairy",
            "protein",
            "wine",
            "ingredient",
            "nutrition",
            "farmer",
            "livestock",
            "horticulture",
            "grain",
            "cotton",
            "agrifood",
            "organic certification",
            "algae",
            "precision fermentation",
            "biomanufacturing",
            "meal planning",
            "grocery",
            "fmcg",
            "seafood",
            "aquaculture",
            "beverage",
            "drinks",
            "cocktail foamer",
            "pet",
            "dog food",
        ),
    ),
    (
        "transport_logistics_infrastructure",
        (
            "transport",
            "road",
            "freight",
            "airport",
            "toll",
            "infrastructure",
            "connectivity",
            "fleet",
            "trucking",
            "logistics",
            "supply chain",
            "maritime",
            "fuel distribution",
            "motorway",
            "tolled motorway",
            "fleet maintenance",
            "fleet management",
            "electric aircraft",
            "aviation operator",
        ),
    ),
    (
        "property_construction",
        (
            "proptech",
            "property",
            "construction",
            "building material",
            "hemp building",
            "prefabricated",
            "real estate",
            "contractor",
            "built environment",
            "property management",
            "site safety",
            "jobsite",
            "construction safety",
            "construction document",
            "heavy industry",
        ),
    ),
    (
        "consumer_marketplace",
        (
            "consumer",
            "retail",
            "advertising",
            "adtech",
            "rewards",
            "creator",
            "media",
            "marketplace",
            "identity",
            "ecommerce",
            "hospitality",
            "entertainment",
            "sports",
            "pet",
            "dog food",
            "brand launch",
            "consumer brand",
            "growth automation",
            "skincare",
            "gaming",
            "casino",
            "consumer electronics",
        ),
    ),
    (
        "enterprise_software_data_security",
        (
            "software",
            "data",
            "cybersecurity",
            "cloud",
            "mlops",
            "content creation",
            "productivity",
            "collaboration",
            "privacy",
            "synthetic data",
            "gpu",
            "data centre",
            "data center",
            "digital infrastructure",
            "connectivity",
            "quantum",
            "precision timing",
            "retail media",
            "enterprise",
            "technology",
            "automotive data",
            "vehicle valuation",
            "market analytics",
            "fund administration",
            "document generation",
            "structured documents",
            "order management",
            "inventory availability",
            "customer research",
            "user research",
            "brand intelligence",
            "sales intelligence",
            "buying signal",
            "contact centre",
            "contact center",
            "customer support",
            "legal technology",
            "legaltech",
            "law firm",
            "contract drafting",
            "tender",
            "proposal",
            "compliance checking",
            "compliance workflow",
            "ai governance",
            "agent governance",
            "cloud finops",
            "cloud cost",
            "finops",
            "software development",
            "app development",
            "field service",
            "event planning",
            "workflow intelligence",
            "digital twin",
            "critical infrastructure",
            "digital receipt",
            "receipt infrastructure",
            "website experimentation",
            "a/b test",
            "ab test",
            "product onboarding",
            "screen sharing",
            "due diligence workspace",
            "rental operations",
            "self service rental",
            "knowledge security",
            "agentic ai",
            "business operating system",
            "analytics",
            "measurement and prediction",
            "semiconductor",
            "chiplet",
            "chip packaging",
            "education technology",
            "online learning",
        ),
    ),
)

THEME_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "preventive_healthcare",
        (
            "preventive",
            "personal health assistant",
            "dementia prevention",
            "longevity",
            "functional medicine",
        ),
    ),
    ("womens_health", ("womens health", "women health", "femtech", "maternal")),
    ("remote_patient_monitoring", ("remote patient", "patient monitoring")),
    ("chronic_care_management", ("chronic", "early intervention", "support")),
    ("respiratory_care", ("respiratory", "smartinhaler", "medication adherence")),
    (
        "medical_devices",
        ("medical device", "medical devices", "device", "biofeedback", "therapy"),
    ),
    ("dental_technology", ("dental",)),
    ("diagnostics", ("diagnostic", "stroke assessment", "imaging", "sensing solution")),
    ("maternal_health", ("maternal", "postpartum")),
    ("clinical_risk_prediction", ("clinical risk", "risk prediction")),
    ("diagnostic_imaging", ("diagnostic imaging", "imaging")),
    ("microbiome_diagnostics", ("microbiome",)),
    ("oligonucleotide_synthesis", ("oligonucleotide",)),
    ("biomarker_testing", ("biomarker", "multiplex")),
    (
        "biotech_life_sciences",
        (
            "biotech",
            "peptide",
            "antifungal",
            "genomics",
            "regenerative medicine",
            "orthopaedic",
            "orthopedic",
        ),
    ),
    ("cell_therapy", ("cell therapy",)),
    (
        "biomanufacturing_fermentation",
        (
            "biomanufacturing",
            "precision fermentation",
            "continuous precision fermentation",
            "hyper fermentation",
            "industrial algae production",
            "algae biotechnology",
            "photobioreactor",
            "strain optimisation",
            "strain optimization",
        ),
    ),
    (
        "drug_delivery",
        ("drug delivery", "ingestible gel", "pharmaceutical", "nutraceutical"),
    ),
    (
        "digital_health_care_coordination",
        (
            "care coordination",
            "care management",
            "home care agency",
            "home care",
            "medical services",
            "technology enabled healthcare",
            "aged care",
            "disability",
            "allied health",
            "child development",
            "developmental care",
            "virtual alcohol detox",
            "detox",
            "recovery clinic",
        ),
    ),
    (
        "digital_health_infrastructure",
        (
            "digital health infrastructure",
            "national digital health infrastructure",
            "health infrastructure",
        ),
    ),
    (
        "wellness_mental_health",
        (
            "wellness",
            "emotional wellness",
            "aromatherapy",
            "scent intelligence",
            "mental wellness",
        ),
    ),
    ("brain_computer_interface", ("brain", "neural", "speech communication")),
    (
        "accessibility_assistive_technology",
        (
            "accessibility",
            "assistive technology",
            "deaf",
            "hearing impaired",
            "speech communication",
        ),
    ),
    ("clinical_decision_support", ("clinical", "decision")),
    ("critical_minerals", ("critical mineral",)),
    ("rare_earths", ("rare earth", "niobium")),
    ("copper", ("copper", "base metal")),
    ("gold", ("gold", "precious metal", "precious metals")),
    ("lithium", ("lithium",)),
    ("antimony", ("antimony",)),
    ("iron_ore", ("iron ore",)),
    ("phosphate", ("phosphate",)),
    ("bulk_commodities", ("bulk commodities", "bulk commodity")),
    ("tungsten", ("tungsten",)),
    ("mineral_exploration", ("mineral exploration", "exploration")),
    ("mineral_drilling", ("drilling",)),
    ("mine_development", ("mine development", "development stage")),
    ("resource_production", ("resource production", "metal resource", "producer")),
    ("mineral_processing", ("processing", "concentrate", "purification")),
    ("mineral_extraction_processing", ("extraction", "purification")),
    ("gas_exploration", ("gas supply", "gas exploration", "coal seam gas")),
    ("mining_workflow_software", ("mining workflow", "mining technology")),
    ("energy_transition_materials", ("energy transition", "battery anode")),
    ("battery_materials", ("battery",)),
    (
        "waste_to_energy",
        (
            "waste to energy",
            "waste sorting",
            "biomass energy",
            "waste treatment",
        ),
    ),
    (
        "renewable_power_generation",
        (
            "renewable",
            "power generation",
            "wind",
            "solar systems",
            "solar system",
            "printed solar",
            "flexible photovoltaic",
        ),
    ),
    (
        "building_integrated_solar",
        (
            "building integrated solar",
            "solar building",
            "solar building envelope",
            "printed solar",
            "flexible photovoltaic",
        ),
    ),
    ("distributed_energy", ("distributed energy", "household energy")),
    ("energy_retail", ("electricity retail", "small business electricity")),
    ("community_solar", ("community owned", "rooftop solar")),
    ("fleet_electrification", ("fleet electrification",)),
    ("ev_charging", ("ev charging",)),
    ("sustainable_aviation_fuel", ("sustainable aviation fuel",)),
    ("industrial_decarbonisation", ("decarbon", "clean energy")),
    ("green_steel", ("green steel", "low emissions steel")),
    ("hydrogen_storage", ("hydrogen storage", "hydrogen")),
    ("carbon_to_chemicals", ("carbon to chemicals",)),
    (
        "clean_chemicals_fertiliser",
        (
            "zero emissions chemical",
            "ammonia",
            "nitric acid",
            "fertiliser",
            "fertilizer",
        ),
    ),
    (
        "circular_economy",
        (
            "circular economy",
            "recycling",
            "reverse logistics",
            "reusable cup",
            "single use waste",
        ),
    ),
    (
        "energy_infrastructure",
        ("energy infrastructure", "gas infrastructure", "energy infrastructure owner"),
    ),
    (
        "biomaterials_sustainable_materials",
        ("biomaterial", "biomaterials", "microbial cellulose", "microbial-cellulose"),
    ),
    ("environmental_services", ("environmental services",)),
    (
        "nature_biodiversity_finance",
        (
            "nature investment",
            "investments into nature",
            "biodiversity",
            "natural capital",
        ),
    ),
    ("methane_reduction", ("methane reduction", "enteric methane")),
    ("advanced_materials", ("advanced material", "advanced materials")),
    ("space_launch", ("space launch", "launch and reentry")),
    ("space_transportation", ("space transportation", "space transport")),
    ("satellite_propulsion", ("satellite", "propulsion")),
    ("in_orbit_servicing", ("refueling", "refuelling", "in orbit servicing")),
    ("hypersonic_testing", ("hypersonic",)),
    ("aerospace_materials", ("aircraft drag", "aerospace material")),
    ("defence_dual_use", ("defence", "defense", "dual use")),
    ("mission_infrastructure", ("mission infrastructure",)),
    (
        "navigation_pnt_systems",
        (
            "resilient positioning navigation and timing",
            "positioning navigation timing",
            "beyond gps",
            "pnt",
            "navigation",
        ),
    ),
    (
        "electric_aviation",
        ("electric aviation", "electric aircraft", "aviation energy infrastructure"),
    ),
    (
        "aviation_compliance_operations",
        (
            "aviation regulatory compliance",
            "aviation document management",
            "aviation compliance",
        ),
    ),
    ("b2b_credit_risk", ("credit risk", "risk scoring")),
    ("working_capital", ("working capital",)),
    ("embedded_insurance", ("embedded insurance", "insurance")),
    ("payments", ("digital payments", "payments", "blockchain payment", "payment")),
    ("stablecoin_settlement", ("stablecoin", "onchain settlement")),
    (
        "capital_markets_trading_infrastructure",
        (
            "capital markets",
            "trading infrastructure",
            "trading workflow",
            "market infrastructure",
            "bitcoin investment",
            "perpetual futures",
            "cross margined futures",
        ),
    ),
    (
        "retail_investing_platforms",
        (
            "investing platform",
            "investment platform",
            "public market investment",
            "stock investing",
        ),
    ),
    ("wealth_management", ("wealth", "financial planning")),
    ("financial_planning", ("financial planning",)),
    (
        "financial_advice_workflows",
        (
            "financial adviser workflow",
            "financial advisor workflow",
            "financial adviser",
            "financial advisers",
            "advice services",
        ),
    ),
    (
        "fund_admin_private_markets",
        (
            "fund administration",
            "private fund administration",
            "private market manager",
            "investment due diligence",
            "due diligence workspace",
        ),
    ),
    (
        "personal_finance_tools",
        (
            "personal finance",
            "money tools",
            "predictive money",
            "harmful spending",
        ),
    ),
    (
        "capital_formation_crowdfunding",
        (
            "equity crowdfunding",
            "crowdfunding",
            "crowd sourced equity",
            "crowd-sourced equity",
            "equity funding platform",
        ),
    ),
    (
        "consumer_finance_banking",
        (
            "consumer lending",
            "consumer finance",
            "retail finance",
            "banking and financial services",
            "digital consumer lender",
            "cards loans retail finance",
        ),
    ),
    ("neobanking", ("neobank", "neobanking")),
    ("home_loan_marketplace", ("home loan", "loan comparison")),
    ("embedded_finance", ("embedded finance",)),
    ("risk_scoring", ("risk scoring", "non bank credit", "credit specialist")),
    ("data_privacy", ("privacy", "data masking", "code security", "logic level code")),
    ("synthetic_data", ("synthetic data",)),
    ("cybersecurity", ("cybersecurity",)),
    (
        "enterprise_data_platform",
        (
            "enterprise data",
            "data platform",
            "analytics",
            "measurement and prediction",
        ),
    ),
    (
        "productivity_collaboration",
        (
            "productivity",
            "collaboration",
            "product onboarding",
            "screen sharing",
        ),
    ),
    (
        "content_creation",
        (
            "visual content",
            "content generation",
            "document generation",
            "structured document",
            "design",
            "graphic",
        ),
    ),
    (
        "automotive_data_intelligence",
        ("automotive data", "vehicle data", "vehicle valuation", "market analytics"),
    ),
    (
        "retail_operations_order_management",
        (
            "distributed order management",
            "order management",
            "inventory availability",
            "retail operations",
            "digital receipt",
            "receipt infrastructure",
        ),
    ),
    (
        "product_analytics_user_research",
        (
            "product analytics",
            "user research",
            "customer research",
            "user path",
            "prototype testing",
            "test ideas",
            "customer feedback",
            "website experimentation",
            "a/b test",
            "ab test",
        ),
    ),
    (
        "sales_marketing_intelligence",
        (
            "sales intelligence",
            "brand intelligence",
            "buying signal",
            "ai sales coaching",
            "sales coaching",
            "brand launch",
            "consumer brand",
            "growth automation",
        ),
    ),
    (
        "vertical_business_operations",
        (
            "workforce management",
            "operations system",
            "field service",
            "workflow intelligence",
            "event planning",
            "major event",
            "fitness business",
            "member engagement",
            "workforce process automation",
            "rental operations",
            "self service rental",
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
            "support teams",
        ),
    ),
    (
        "legaltech_contract_workflows",
        (
            "legal technology",
            "legaltech",
            "law firm",
            "contract",
            "drafting",
            "legal drafting",
        ),
    ),
    (
        "developer_tools_app_platforms",
        (
            "developer",
            "app development",
            "app platform",
            "software development",
            "custom software development",
            "company documents",
            "institutional knowledge",
        ),
    ),
    (
        "compliance_risk_workflows",
        (
            "compliance checking",
            "compliance workflow",
            "risk workflow",
            "regulatory workflow",
        ),
    ),
    (
        "ai_governance_security",
        (
            "ai governance",
            "agent governance",
            "ai agent governance",
            "ai security",
            "model governance",
            "agentic ai",
            "knowledge security",
        ),
    ),
    (
        "proposal_tender_workflows",
        ("tender", "proposal workflow", "proposal automation", "proposal"),
    ),
    (
        "cloud_finops",
        ("cloud finops", "finops", "cloud cost", "cloud cost automation"),
    ),
    (
        "digital_twin_infrastructure",
        ("digital twin", "critical infrastructure digital twin", "physics enabled"),
    ),
    (
        "semiconductor_packaging",
        ("semiconductor", "chiplet", "advanced chip packaging", "interconnect"),
    ),
    ("geospatial_mlops", ("geospatial", "mlops")),
    ("cloud_infrastructure", ("cloud infrastructure", "data centres", "data centers")),
    ("data_centres", ("data centre", "data centres", "data center", "data centers")),
    ("digital_infrastructure", ("digital infrastructure", "connectivity")),
    ("cloud_connectivity", ("cloud and network", "network connectivity")),
    ("retail_media_networks", ("retail media",)),
    ("adtech_decisioning", ("ad decision", "media buying", "adtech")),
    ("quantum_precision_timing", ("quantum", "precision timing", "pnt")),
    ("ai_infrastructure", ("ai infrastructure", "gpu cloud", "gpu")),
    (
        "education_training_platforms",
        (
            "online learning",
            "skills training",
            "career portfolio",
            "teacher",
            "school",
            "curriculum",
            "teaching",
            "assessment",
            "higher education",
            "vocational education",
            "youth entrepreneurship",
            "future skills",
            "education and research",
        ),
    ),
    (
        "career_skills_verification",
        ("proof of work career", "career portfolio", "skills verification"),
    ),
    ("autonomous_mapping", ("autonomous mapping", "mapping")),
    (
        "autonomous_navigation_systems",
        (
            "autonomous systems",
            "positioning navigation",
            "autonomous transport",
            "modular vehicle",
            "robot vehicle",
            "drone",
        ),
    ),
    ("industrial_robotics", ("industrial robotics", "robotics")),
    ("advanced_manufacturing", ("advanced manufacturing", "light manufacturing")),
    ("robotic_metal_forming", ("robotic metal forming", "metal forming")),
    ("storage_equipment", ("storage equipment",)),
    ("industrial_equipment", ("industrial equipment", "screw conveyor")),
    (
        "asset_maintenance_fleet_management",
        (
            "fleet maintenance",
            "fleet management",
            "maintenance management",
            "equipment hire",
            "asset maintenance",
        ),
    ),
    ("computer_vision_inspection", ("computer vision", "inspection")),
    ("waste_sorting_automation", ("waste sorting",)),
    ("automotive_parts_intelligence", ("automotive parts",)),
    ("procurement_automation", ("procurement",)),
    ("hazardous_environment_mapping", ("hazardous",)),
    ("alternative_protein", ("alternative protein",)),
    ("functional_ingredients", ("functional protein", "ingredient")),
    (
        "industrial_biotechnology",
        ("industrial biotechnology", "industrial algae production", "photobioreactor"),
    ),
    ("plant_propagation", ("plant propagation",)),
    ("organic_certification_traceability", ("organic certification", "traceability")),
    ("livestock_management", ("livestock", "cattle", "rancher")),
    ("virtual_fencing", ("virtual fencing", "move fence")),
    (
        "agriculture_supply_chain",
        ("agriculture supply chain", "wool", "cotton logistics"),
    ),
    ("grain_storage", ("grain storage",)),
    ("horticulture", ("horticultural", "horticulture")),
    ("cotton_ginning", ("cotton ginning",)),
    ("agrifood_regtech", ("agrifood regtech",)),
    (
        "foodservice_commerce",
        (
            "foodservice",
            "hospitality venues",
            "restaurant",
            "restaurants",
            "promotions",
        ),
    ),
    ("dairy_nutrition", ("dairy", "nutrition")),
    ("aquaculture_seafood", ("seafood", "aquaculture", "saline water")),
    ("pet_care_nutrition", ("pet care", "pet nutrition", "dog food")),
    ("wine_production", ("wine",)),
    (
        "agtech",
        (
            "agtech",
            "agriculture",
            "orchard management",
            "irrigation",
            "nutrient management",
        ),
    ),
    ("sustainable_agriculture", ("sustainable agriculture",)),
    (
        "food_processing",
        (
            "food and beverage",
            "preserves",
            "premium preserves",
            "food manufacturing",
            "beverage manufacturing",
            "cocktail foamer",
            "drinks",
            "beverage",
        ),
    ),
    ("food_waste_upcycling", ("food waste", "upcycling")),
    ("grocery_meal_planning", ("meal planning", "grocery comparison", "fmcg insights")),
    ("ingredient_manufacturing", ("ingredient manufacturing",)),
    ("airport_operations", ("airport",)),
    ("toll_roads", ("toll road", "tolled motorway", "motorway operations")),
    ("road_freight", ("road freight", "trucking")),
    ("supply_chain_logistics", ("supply chain", "logistics")),
    ("maritime_transport", ("maritime",)),
    ("fuel_distribution", ("fuel distribution", "fuelled", "lubricants")),
    ("transport_energy_supply", ("transport energy",)),
    ("fleet_fuel_management", ("fuel management",)),
    ("electric_heavy_trucking", ("zero emission road freight", "electric trucking")),
    ("infrastructure_operations", ("infrastructure operations",)),
    ("connectivity_infrastructure", ("connectivity",)),
    (
        "property_transaction_automation",
        (
            "property transaction",
            "estate specialists",
            "estate specialist",
            "estate information",
        ),
    ),
    ("construction_payments", ("construction payment",)),
    ("building_materials", ("building material",)),
    ("prefabricated_building_systems", ("prefabricated",)),
    ("hemp_building_materials", ("hemp building", "hemp")),
    (
        "real_estate_workflows",
        (
            "real estate",
            "built environment",
            "property management",
            "property management crm",
            "jobsite safety",
            "construction safety",
            "construction document",
            "jobsites",
        ),
    ),
    ("contractor_finance", ("contractor",)),
    ("digital_advertising", ("digital advertising", "advertising")),
    ("consumer_electronics", ("consumer electronics", "digital reading")),
    ("sports_technology", ("sports technology", "teamwear", "sports", "performance")),
    ("hospitality_entertainment", ("hospitality", "entertainment", "casino", "hotel")),
    ("skincare", ("skincare",)),
    ("ecommerce", ("ecommerce", "e commerce")),
    ("consumer_rewards", ("rewards",)),
    ("creator_tools", ("creator",)),
    ("immersive_ar_experiences", ("augmented reality", "ar experience", "immersive")),
    ("merchant_embedded_protection", ("merchant", "protection")),
    ("marketplace_platform", ("marketplace",)),
    ("identity_verified_actions", ("verified identity", "identity verified")),
    ("stablecoins", ("stablecoin",)),
    ("onchain_settlement", ("onchain settlement", "onchain")),
    (
        "crypto_exchange",
        (
            "crypto exchange",
            "solana",
            "non custodial crypto swap",
            "non custodial crypto swaps",
            "crypto fintech",
        ),
    ),
    ("tokenized_payments", ("token", "tokenized")),
    ("web3_rewards", ("web3 rewards",)),
    ("blockchain_financial_infrastructure", ("blockchain", "bitcoin")),
    ("infrastructure_investment", ("infrastructure investment",)),
    ("managed_accounts", ("managed account",)),
    ("private_wealth", ("private wealth",)),
    ("institutional_asset_management", ("institutional asset",)),
    ("portfolio_management", ("portfolio management",)),
    ("regenerative_seaweed", ("regenerative seaweed", "seaweed")),
    ("marine_conservation", ("marine conservation",)),
    ("traceable_supply_chain", ("traceable supply", "supply chain")),
    ("sustainable_smallholder_supply", ("smallholder",)),
)


TAXONOMY_LAYER_2_BY_LAYER_1 = {
    "healthcare_life_sciences": [
        "preventive_chronic_care",
        "womens_maternal_health",
        "remote_patient_monitoring",
        "medical_devices",
        "diagnostics",
        "biotech_life_sciences",
        "biomanufacturing_fermentation",
        "drug_delivery",
        "neurotechnology",
        "accessibility_assistive_technology",
        "digital_health_infrastructure",
        "wellness_mental_health",
        "clinical_decision_support",
        "digital_health_care_coordination",
    ],
    "resources_mining_metals": [
        "critical_minerals",
        "rare_earths",
        "base_precious_metals",
        "bulk_commodities",
        "mineral_exploration_drilling",
        "mine_development_production",
        "mineral_processing",
        "gas_resources",
        "mining_workflow_software",
    ],
    "energy_climate": [
        "battery_storage",
        "renewable_distributed_energy",
        "solar_building_energy",
        "electrification_ev_fleet",
        "sustainable_fuels_hydrogen",
        "industrial_decarbonisation",
        "clean_chemicals_fertiliser",
        "circular_waste_recycling",
        "environmental_services",
        "nature_biodiversity_finance",
        "energy_infrastructure",
        "biomaterials_sustainable_materials",
    ],
    "aerospace_space_defence": [
        "space_launch_transport",
        "satellite_space_systems",
        "in_orbit_servicing",
        "hypersonics_defence",
        "defence_dual_use",
        "aerospace_materials",
        "mission_infrastructure",
        "navigation_pnt_systems",
        "electric_aviation",
        "aviation_compliance_operations",
    ],
    "fintech_financial_services": [
        "payments_settlement",
        "digital_assets_web3",
        "lending_credit_risk",
        "working_capital_finance",
        "insurance",
        "embedded_finance",
        "home_loans_mortgages",
        "wealth_asset_management",
        "financial_advice_workflows",
        "fund_admin_private_markets",
        "personal_finance_tools",
        "capital_markets_trading_infrastructure",
        "retail_investing_platforms",
        "capital_formation_crowdfunding",
        "consumer_finance_banking",
    ],
    "enterprise_software_data_security": [
        "data_privacy_security",
        "enterprise_data_platforms",
        "productivity_collaboration",
        "content_design_tools",
        "product_analytics_user_research",
        "sales_marketing_intelligence",
        "vertical_business_operations",
        "customer_support_contact_center",
        "legaltech_contract_workflows",
        "developer_tools_app_platforms",
        "compliance_risk_workflows",
        "ai_governance_security",
        "proposal_tender_workflows",
        "cloud_finops",
        "geospatial_mapping_mlops",
        "cloud_data_infrastructure",
        "ai_compute_infrastructure",
        "quantum_timing_infrastructure",
        "automotive_data_intelligence",
        "retail_operations_order_management",
        "digital_twin_infrastructure",
        "semiconductor_packaging",
    ],
    "education_workforce": [
        "education_training_platforms",
        "career_skills_verification",
    ],
    "industrial_robotics_automation": [
        "autonomous_mapping",
        "autonomous_navigation_systems",
        "industrial_robotics",
        "computer_vision_inspection",
        "industrial_automation_procurement",
        "manufacturing_equipment",
        "asset_maintenance_fleet_management",
        "automotive_parts_intelligence",
        "hazardous_environment_operations",
        "waste_sorting_automation",
    ],
    "food_agriculture": [
        "alternative_protein_ingredients",
        "industrial_biotechnology",
        "dairy_nutrition",
        "wine_beverage",
        "agtech_farm_management",
        "sustainable_agriculture",
        "livestock_management",
        "agriculture_supply_chain_traceability",
        "food_processing_manufacturing",
        "aquaculture_seafood",
    ],
    "transport_logistics_infrastructure": [
        "airport_operations",
        "road_freight_mobility",
        "logistics_supply_chain",
        "maritime_transport",
        "transport_energy_fuel",
        "infrastructure_operations_connectivity",
    ],
    "property_construction": [
        "property_transaction_workflows",
        "construction_payments_finance",
        "building_materials",
        "prefabricated_sustainable_buildings",
        "real_estate_construction_workflows",
    ],
    "consumer_marketplace": [
        "digital_advertising_marketing",
        "consumer_rewards_loyalty",
        "creator_content_tools",
        "marketplace_commerce",
        "grocery_meal_planning",
        "consumer_identity_trust",
        "consumer_products",
        "pet_care_nutrition",
        "immersive_ar_experiences",
        "hospitality_entertainment",
    ],
}

CANONICAL_THEME_CODES = {
    theme for themes in TAXONOMY_LAYER_2_BY_LAYER_1.values() for theme in themes
}

THEME_ALIASES = {
    "preventive_healthcare": "preventive_chronic_care",
    "chronic_care_management": "preventive_chronic_care",
    "respiratory_care": "medical_devices",
    "womens_health": "womens_maternal_health",
    "maternal_health": "womens_maternal_health",
    "dental_technology": "medical_devices",
    "diagnostic_imaging": "diagnostics",
    "biomarker_testing": "diagnostics",
    "microbiome_diagnostics": "diagnostics",
    "cell_therapy": "biotech_life_sciences",
    "oligonucleotide_synthesis": "biotech_life_sciences",
    "brain_computer_interface": "neurotechnology",
    "clinical_risk_prediction": "clinical_decision_support",
    "lithium": "critical_minerals",
    "antimony": "critical_minerals",
    "tungsten": "critical_minerals",
    "copper": "base_precious_metals",
    "gold": "base_precious_metals",
    "iron_ore": "bulk_commodities",
    "phosphate": "bulk_commodities",
    "mineral_exploration": "mineral_exploration_drilling",
    "mineral_drilling": "mineral_exploration_drilling",
    "mine_development": "mine_development_production",
    "resource_production": "mine_development_production",
    "mineral_extraction_processing": "mineral_processing",
    "gas_exploration": "gas_resources",
    "energy_transition_materials": "critical_minerals",
    "battery_materials": "battery_storage",
    "waste_to_energy": "circular_waste_recycling",
    "renewable_power_generation": "renewable_distributed_energy",
    "distributed_energy": "renewable_distributed_energy",
    "energy_retail": "renewable_distributed_energy",
    "community_solar": "renewable_distributed_energy",
    "building_integrated_solar": "solar_building_energy",
    "fleet_electrification": "electrification_ev_fleet",
    "ev_charging": "electrification_ev_fleet",
    "sustainable_aviation_fuel": "sustainable_fuels_hydrogen",
    "hydrogen_storage": "sustainable_fuels_hydrogen",
    "green_steel": "industrial_decarbonisation",
    "carbon_to_chemicals": "industrial_decarbonisation",
    "advanced_materials": "industrial_decarbonisation",
    "circular_economy": "circular_waste_recycling",
    "methane_reduction": "sustainable_agriculture",
    "space_launch": "space_launch_transport",
    "space_transportation": "space_launch_transport",
    "satellite_propulsion": "satellite_space_systems",
    "hypersonic_testing": "hypersonics_defence",
    "payments": "payments_settlement",
    "stablecoin_settlement": "digital_assets_web3",
    "stablecoins": "digital_assets_web3",
    "onchain_settlement": "digital_assets_web3",
    "crypto_exchange": "digital_assets_web3",
    "tokenized_payments": "digital_assets_web3",
    "blockchain_financial_infrastructure": "digital_assets_web3",
    "web3_rewards": "digital_assets_web3",
    "b2b_credit_risk": "lending_credit_risk",
    "risk_scoring": "lending_credit_risk",
    "working_capital": "working_capital_finance",
    "embedded_insurance": "insurance",
    "neobanking": "payments_settlement",
    "home_loan_marketplace": "home_loans_mortgages",
    "wealth_management": "wealth_asset_management",
    "managed_accounts": "wealth_asset_management",
    "private_wealth": "wealth_asset_management",
    "institutional_asset_management": "wealth_asset_management",
    "portfolio_management": "wealth_asset_management",
    "financial_planning": "wealth_asset_management",
    "data_privacy": "data_privacy_security",
    "synthetic_data": "data_privacy_security",
    "cybersecurity": "data_privacy_security",
    "enterprise_data_platform": "enterprise_data_platforms",
    "content_creation": "content_design_tools",
    "geospatial_mlops": "geospatial_mapping_mlops",
    "cloud_infrastructure": "cloud_data_infrastructure",
    "data_centres": "cloud_data_infrastructure",
    "digital_infrastructure": "cloud_data_infrastructure",
    "cloud_connectivity": "cloud_data_infrastructure",
    "ai_infrastructure": "ai_compute_infrastructure",
    "retail_media_networks": "digital_advertising_marketing",
    "adtech_decisioning": "digital_advertising_marketing",
    "quantum_precision_timing": "quantum_timing_infrastructure",
    "advanced_manufacturing": "manufacturing_equipment",
    "robotic_metal_forming": "manufacturing_equipment",
    "storage_equipment": "manufacturing_equipment",
    "industrial_equipment": "manufacturing_equipment",
    "procurement_automation": "industrial_automation_procurement",
    "hazardous_environment_mapping": "hazardous_environment_operations",
    "functional_ingredients": "alternative_protein_ingredients",
    "alternative_protein": "alternative_protein_ingredients",
    "ingredient_manufacturing": "food_processing_manufacturing",
    "plant_propagation": "agtech_farm_management",
    "horticulture": "agtech_farm_management",
    "grain_storage": "agriculture_supply_chain_traceability",
    "cotton_ginning": "agriculture_supply_chain_traceability",
    "organic_certification_traceability": "agriculture_supply_chain_traceability",
    "agrifood_regtech": "agriculture_supply_chain_traceability",
    "traceable_supply_chain": "agriculture_supply_chain_traceability",
    "sustainable_smallholder_supply": "sustainable_agriculture",
    "virtual_fencing": "livestock_management",
    "agriculture_supply_chain": "agriculture_supply_chain_traceability",
    "food_waste_upcycling": "food_processing_manufacturing",
    "food_processing": "food_processing_manufacturing",
    "foodservice_commerce": "marketplace_commerce",
    "wine_production": "wine_beverage",
    "agtech": "agtech_farm_management",
    "regenerative_seaweed": "environmental_services",
    "marine_conservation": "environmental_services",
    "airport_operations": "airport_operations",
    "toll_roads": "road_freight_mobility",
    "road_freight": "road_freight_mobility",
    "electric_heavy_trucking": "road_freight_mobility",
    "supply_chain_logistics": "logistics_supply_chain",
    "fuel_distribution": "transport_energy_fuel",
    "transport_energy_supply": "transport_energy_fuel",
    "fleet_fuel_management": "transport_energy_fuel",
    "connectivity_infrastructure": "infrastructure_operations_connectivity",
    "infrastructure_operations": "infrastructure_operations_connectivity",
    "infrastructure_investment": "infrastructure_operations_connectivity",
    "property_transaction_automation": "property_transaction_workflows",
    "construction_payments": "construction_payments_finance",
    "contractor_finance": "construction_payments_finance",
    "prefabricated_building_systems": "prefabricated_sustainable_buildings",
    "hemp_building_materials": "prefabricated_sustainable_buildings",
    "real_estate_workflows": "real_estate_construction_workflows",
    "digital_advertising": "digital_advertising_marketing",
    "consumer_rewards": "consumer_rewards_loyalty",
    "creator_tools": "creator_content_tools",
    "consumer_electronics": "consumer_products",
    "sports_technology": "consumer_products",
    "skincare": "consumer_products",
    "ecommerce": "marketplace_commerce",
    "marketplace_platform": "marketplace_commerce",
    "merchant_embedded_protection": "insurance",
    "identity_verified_actions": "consumer_identity_trust",
}


def canonical_theme_code(theme: str) -> str | None:
    canonical = THEME_ALIASES.get(theme, theme)
    return canonical if canonical in CANONICAL_THEME_CODES else None


def canonicalize_themes(themes: list[str]) -> list[str]:
    canonical_themes = []
    for theme in themes:
        canonical = canonical_theme_code(theme)
        if canonical and canonical not in canonical_themes:
            canonical_themes.append(canonical)
    return canonical_themes


def classify_company(
    company_data: dict[str, Any], round_data: dict[str, Any]
) -> dict[str, Any]:
    text = combined_text(
        company_data.get("sector_primary"),
        company_data.get("sector_secondary"),
        company_data.get("use_case_primary"),
        company_data.get("use_case_secondary"),
        company_data.get("company_summary"),
        round_data.get("org_industries_raw"),
    )
    text = f" {text} "

    sectors = [
        sector
        for sector, keywords in SECTOR_RULES
        if contains_any(text, tuple(f" {keyword} " for keyword in keywords))
        or contains_any(text, keywords)
    ]
    sectors = [sector for sector in dict.fromkeys(sectors) if sector in ACTUAL_SECTORS]

    themes = [
        theme
        for theme, keywords in THEME_RULES
        if contains_any(text, tuple(f" {keyword} " for keyword in keywords))
        or contains_any(text, keywords)
    ]
    themes = canonicalize_themes(list(dict.fromkeys(themes)))
    missing_dimensions = []
    if not sectors:
        missing_dimensions.append("actual_sector")
    if not themes:
        missing_dimensions.append("actual_themes")
    issue_type = None
    if len(missing_dimensions) == 2:
        issue_type = "unassigned_taxonomy"
    elif missing_dimensions:
        issue_type = "partial_taxonomy_assignment"

    return {
        "actual_sector": sectors[:3],
        "actual_themes": themes[:8],
        "manual_review_required": bool(missing_dimensions),
        "manual_review_issue_type": issue_type,
        "missing_dimensions": missing_dimensions,
        "business_model": normalize_business_model(company_data.get("business_model")),
        "customer_type": normalize_customer_type(company_data.get("customer_type")),
        "sales_motion": normalize_sales_motion(company_data.get("sales_motion")),
        "technology_depth": normalize_technology_depth(
            company_data.get("technology_depth")
        ),
        "ai_relevance": normalize_ai_relevance(company_data.get("ai_relevance")),
        "ai_usage_type": normalize_ai_usage_type(company_data.get("ai_usage_type")),
        "geography": geography_tags(company_data),
    }


def geography_tags(company_data: dict[str, Any]) -> list[str]:
    tags = []
    country = str(company_data.get("hq_country") or "").upper()
    if country:
        tags.append(country)
    if company_data.get("is_anz") or country in {"AU", "NZ"}:
        tags.append("ANZ")
    return list(dict.fromkeys(tags))


def distribution(
    items: list[tuple[list[str], list[str]]], secondary_weight: float = 0.4
) -> dict[str, Any]:
    raw: dict[str, dict[str, Any]] = {}
    scores: Counter[str] = Counter()
    for primary_values, secondary_values in items:
        for value in primary_values:
            bucket = raw.setdefault(value, {"as_primary": 0, "as_secondary": 0})
            bucket["as_primary"] += 1
            scores[value] += 1.0
        for value in secondary_values:
            bucket = raw.setdefault(value, {"as_primary": 0, "as_secondary": 0})
            bucket["as_secondary"] += 1
            scores[value] += secondary_weight
    total = sum(scores.values())
    weighted = {
        key: round(value / total, 4) for key, value in scores.most_common() if total > 0
    }
    return {"raw": raw, "weighted": weighted}


def top_weighted(
    distribution_value: dict[str, Any], limit: int = 6, min_weight: float = 0.1
) -> list[str]:
    weighted = distribution_value.get("weighted") or {}
    raw = distribution_value.get("raw") or {}
    selected = []
    for key, weight in sorted(weighted.items(), key=lambda item: item[1], reverse=True):
        counts = raw.get(key) or {}
        if counts.get("as_primary", 0) > 0 or weight >= min_weight:
            selected.append(key)
        if len(selected) >= limit:
            break
    return selected


def recent_activity_score(dates: list[date]) -> float | None:
    if not dates:
        return None
    latest = max(dates)
    age_days = (date(2026, 7, 17) - latest).days
    if age_days <= 90:
        return 1.0
    if age_days <= 180:
        return 0.85
    if age_days <= 365:
        return 0.7
    if age_days <= 730:
        return 0.45
    return 0.2


def data_quality_for_count(count: int) -> str:
    if count >= 3:
        return "high"
    if count >= 1:
        return "medium"
    return "low"


def confidence_for_count(count: int) -> float:
    if count <= 0:
        return 0.0
    if count == 1:
        return 0.45
    if count == 2:
        return 0.65
    return min(0.95, 0.75 + (count - 3) * 0.04)


def pct(numerator: int, denominator: int) -> float | None:
    if denominator <= 0:
        return None
    return round(numerator / denominator, 4)


def insert_returning_id(
    connection: Connection,
    table: str,
    values: dict[str, Any],
) -> str:
    columns = list(values)
    placeholders = [sql.Placeholder(column) for column in columns]
    query = sql.SQL("INSERT INTO {} ({}) VALUES ({}) RETURNING id::text").format(
        sql.Identifier(table),
        sql.SQL(", ").join(sql.Identifier(column) for column in columns),
        sql.SQL(", ").join(placeholders),
    )
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query, values)
        row = cursor.fetchone()
    if not row:
        raise RuntimeError(f"Insert into {table} did not return an id")
    return str(row["id"])


def import_investors(
    connection: Connection, records: list[dict[str, Any]], state: ImportState
) -> None:
    seen_websites: set[str] = set()
    seen_linkedins: set[str] = set()
    for envelope in records:
        data = envelope["data"]
        record_key = envelope["record_key"]
        website_url = normalize_identity_url(data.get("website_url"))
        linkedin_url = normalize_identity_url(data.get("linkedin_url"))
        if website_url and website_url.lower() in seen_websites:
            state.skipped["investors_duplicate_website_cleared"] += 1
            website_url = None
        if linkedin_url and linkedin_url.lower() in seen_linkedins:
            state.skipped["investors_duplicate_linkedin_cleared"] += 1
            linkedin_url = None
        if website_url:
            seen_websites.add(website_url.lower())
        if linkedin_url:
            seen_linkedins.add(linkedin_url.lower())
        values = {
            "canonical_name": data.get("canonical_name"),
            "aliases": as_jsonb_array(data.get("aliases")),
            "investor_type": normalize_investor_type(data.get("investor_type")),
            "website_url": website_url,
            "linkedin_url": linkedin_url,
            "hq_country": data.get("hq_country"),
            "hq_state": data.get("hq_state"),
            "hq_city": data.get("hq_city"),
            "offices": as_jsonb_array(data.get("offices")),
            "status": data.get("status") or "active",
            "review_status": normalize_review_status(data.get("review_status")),
            "last_reviewed_at": as_datetime_text(data.get("last_reviewed_at")),
            "last_reviewed_by": None,
        }
        state.record_ids[record_key] = insert_returning_id(
            connection, "investors", values
        )
        state.records["investors"][record_key] = envelope


def import_investor_web_profiles(
    connection: Connection,
    records: list[dict[str, Any]],
    state: ImportState,
) -> None:
    for envelope in records:
        data = envelope["data"]
        investor_id = state.record_ids.get(
            (envelope.get("refs") or {}).get("investor_key")
        )
        if not investor_id:
            state.skipped["investor_web_profiles_missing_investor"] += 1
            continue
        values = {
            "investor_id": investor_id,
            "source_urls": as_jsonb_array(data.get("source_urls")),
            "retrieved_at": as_datetime_text(data.get("retrieved_at")),
            "website_status": data.get("website_status") or "ok",
            "raw_content_hash": data.get("raw_content_hash"),
            "raw_content_ref": data.get("raw_content_ref"),
            "extraction_model": data.get("extraction_model"),
            "extraction_version": data.get("extraction_version"),
            "confidence": normalize_confidence(data.get("confidence")),
            "claimed_thesis": data.get("claimed_thesis"),
            "claimed_stages": as_jsonb_array(data.get("claimed_stages")),
            "claimed_sectors": as_jsonb_array(data.get("claimed_sectors")),
            "claimed_geographies": as_jsonb_array(data.get("claimed_geographies")),
            "claimed_business_models": as_jsonb_array(
                data.get("claimed_business_models")
            ),
            "claimed_cheque_min": data.get("claimed_cheque_min"),
            "claimed_cheque_max": data.get("claimed_cheque_max"),
            "claimed_cheque_currency": normalize_currency(
                data.get("claimed_cheque_currency")
            ),
            "contact_emails": as_jsonb_array(data.get("contact_emails")),
            "application_url": data.get("application_url"),
            "contact_notes": data.get("contact_notes"),
            "is_current": data.get("is_current", True),
            "superseded_at": as_datetime_text(data.get("superseded_at")),
        }
        insert_returning_id(connection, "investor_web_profiles", values)
        state.records["investor_web_profiles"][envelope["record_key"]] = envelope


def import_investor_team_members(
    connection: Connection,
    records: list[dict[str, Any]],
    state: ImportState,
) -> None:
    for envelope in records:
        data = envelope["data"]
        investor_id = state.record_ids.get(
            (envelope.get("refs") or {}).get("investor_key")
        )
        if not investor_id:
            state.skipped["investor_team_members_missing_investor"] += 1
            continue
        values = {
            "investor_id": investor_id,
            "contact_id": None,
            "first_name": data.get("first_name") or "Unknown",
            "last_name": data.get("last_name"),
            "role_title": data.get("role_title"),
            "seniority": data.get("seniority")
            if data.get("seniority")
            in {"partner", "principal", "associate", "analyst", "operator", "other"}
            else "other",
            "linkedin_url": data.get("linkedin_url"),
            "claimed_focus": as_jsonb_array(data.get("claimed_focus")),
            "bio_summary": data.get("bio_summary"),
            "source_url": data.get("source_url"),
            "retrieved_at": as_datetime_text(data.get("retrieved_at")),
            "is_active": data.get("is_active", True),
        }
        insert_returning_id(connection, "investor_team_members", values)
        state.records["investor_team_members"][envelope["record_key"]] = envelope


def import_investee_profiles(
    connection: Connection,
    records: list[dict[str, Any]],
    state: ImportState,
) -> None:
    for envelope in records:
        data = envelope["data"]
        values = {
            "name": data.get("name"),
            "website_url": data.get("website_url"),
            "crunchbase_uuid": data.get("crunchbase_uuid"),
            "hq_country": data.get("hq_country"),
            "hq_state": data.get("hq_state"),
            "hq_city": data.get("hq_city"),
            "is_anz": data.get("is_anz"),
            "sector_primary": data.get("sector_primary"),
            "sector_secondary": json.dumps(data.get("sector_secondary"))
            if isinstance(data.get("sector_secondary"), list)
            else data.get("sector_secondary"),
            "use_case_primary": data.get("use_case_primary"),
            "use_case_secondary": as_jsonb_array(data.get("use_case_secondary")),
            "customer_type": normalize_customer_type(data.get("customer_type")),
            "business_model": normalize_business_model(data.get("business_model")),
            "sales_motion": normalize_sales_motion(data.get("sales_motion")),
            "technology_depth": normalize_technology_depth(
                data.get("technology_depth")
            ),
            "ai_relevance": normalize_ai_relevance(data.get("ai_relevance")),
            "ai_usage_type": normalize_ai_usage_type(data.get("ai_usage_type")),
            "ai_core_or_enabler": normalize_ai_core_or_enabler(
                data.get("ai_core_or_enabler")
            ),
            "company_summary": data.get("company_summary"),
            "source_urls": as_jsonb_array(data.get("source_urls")),
            "retrieved_at": as_datetime_text(data.get("retrieved_at")),
            "raw_content_hash": data.get("raw_content_hash"),
            "extraction_model": data.get("extraction_model"),
            "extraction_version": data.get("extraction_version"),
            "confidence": normalize_confidence(data.get("confidence")),
        }
        state.record_ids[envelope["record_key"]] = insert_returning_id(
            connection, "investee_company_profiles", values
        )
        state.records["investee_company_profiles"][envelope["record_key"]] = envelope


def import_funding_rounds(
    connection: Connection,
    records: list[dict[str, Any]],
    state: ImportState,
) -> None:
    for envelope in records:
        data = envelope["data"]
        investee_id = state.record_ids.get(
            (envelope.get("refs") or {}).get("investee_company_key")
        )
        values = {
            "source_provider": normalize_source_provider(data.get("source_provider")),
            "source_record_id": data.get("source_record_id"),
            "dedupe_key": data.get("dedupe_key"),
            "source_url": data.get("source_url"),
            "source_payload": as_jsonb(data.get("source_payload")),
            "investee_company_id": investee_id,
            "investee_name_raw": data.get("investee_name_raw") or "Unknown",
            "org_location_raw": data.get("org_location_raw"),
            "org_website_raw": data.get("org_website_raw"),
            "org_industries_raw": data.get("org_industries_raw"),
            "round_type_raw": data.get("round_type_raw"),
            "round_stage": normalize_stage(data.get("round_stage")),
            "funding_stage_raw": data.get("funding_stage_raw"),
            "announced_date": as_date(data.get("announced_date")),
            "money_raised_raw": data.get("money_raised_raw"),
            "amount": data.get("amount"),
            "currency": normalize_currency(data.get("currency")),
            "amount_usd": data.get("amount_usd"),
            "pre_money_valuation_raw": data.get("pre_money_valuation_raw"),
            "pre_money_valuation": data.get("pre_money_valuation"),
            "valuation_currency": normalize_currency(data.get("valuation_currency")),
            "valuation_usd": data.get("valuation_usd"),
            "equity_only": data.get("equity_only"),
            "total_funding_raw": data.get("total_funding_raw"),
            "investor_names_raw": data.get("investor_names_raw"),
            "lead_investor_names_raw": data.get("lead_investor_names_raw"),
            "imported_at": as_datetime_text(data.get("imported_at")),
            "import_batch_id": data.get("import_batch_id"),
        }
        state.record_ids[envelope["record_key"]] = insert_returning_id(
            connection, "funding_rounds", values
        )
        state.records["funding_rounds"][envelope["record_key"]] = envelope


def import_deal_investors(
    connection: Connection,
    records: list[dict[str, Any]],
    state: ImportState,
) -> None:
    for envelope in records:
        data = envelope["data"]
        refs = envelope.get("refs") or {}
        deal_id = state.record_ids.get(refs.get("deal_key"))
        investor_id = state.record_ids.get(refs.get("investor_key"))
        if not deal_id:
            state.skipped["deal_investors_missing_deal"] += 1
            continue
        values = {
            "deal_id": deal_id,
            "investor_id": investor_id,
            "raw_name": data.get("raw_name") or "Unknown",
            "role": one_of(data.get("role"), ALLOWED_DEAL_ROLES, "unknown"),
            "participation_status": one_of(
                data.get("participation_status"), ALLOWED_PARTICIPATION, "unknown"
            ),
            "resolution": one_of(
                data.get("resolution"), ALLOWED_RESOLUTION, "unresolved"
            ),
            "resolution_confidence": normalize_confidence(
                data.get("resolution_confidence")
            ),
        }
        state.record_ids[envelope["record_key"]] = insert_returning_id(
            connection, "deal_investors", values
        )
        state.records["deal_investors"][envelope["record_key"]] = envelope


def import_external_ids(
    connection: Connection,
    records: list[dict[str, Any]],
    state: ImportState,
    *,
    table: str,
    ref_key: str,
    fk_column: str,
) -> None:
    for envelope in records:
        data = envelope["data"]
        parent_id = state.record_ids.get((envelope.get("refs") or {}).get(ref_key))
        if not parent_id:
            state.skipped[f"{table}_missing_parent"] += 1
            continue
        values = {
            fk_column: parent_id,
            "source_provider": normalize_source_provider(data.get("source_provider")),
            "external_id": data.get("external_id"),
            "external_url": data.get("external_url"),
            "first_seen_at": as_datetime_text(data.get("first_seen_at")),
            "last_seen_at": as_datetime_text(data.get("last_seen_at")),
            "source_payload": as_jsonb(
                {
                    "record_key": envelope.get("record_key"),
                    "provenance": envelope.get("provenance"),
                    "review": envelope.get("review"),
                }
            ),
        }
        insert_returning_id(connection, table, values)
        state.records[table][envelope["record_key"]] = envelope


def build_deal_evidence(state: ImportState) -> list[dict[str, Any]]:
    evidence = []
    for deal_inv_key, deal_inv in state.records["deal_investors"].items():
        refs = deal_inv.get("refs") or {}
        round_key = refs.get("deal_key")
        investor_key = refs.get("investor_key")
        if not round_key or not investor_key:
            continue
        round_record = state.records["funding_rounds"].get(round_key)
        investor_record = state.records["investors"].get(investor_key)
        if not round_record or not investor_record:
            continue
        company_key = (round_record.get("refs") or {}).get("investee_company_key")
        company_record = state.records["investee_company_profiles"].get(company_key)
        if not company_record:
            continue
        round_data = round_record["data"]
        company_data = company_record["data"]
        stage = normalize_stage(round_data.get("round_stage"))
        classification = classify_company(company_data, round_data)
        if classification["manual_review_required"]:
            maybe_add_manual_review_item(
                state,
                company_key=company_key,
                round_key=round_key,
                company_data=company_data,
                round_data=round_data,
                classification=classification,
            )
        evidence.append(
            {
                "deal_investor_key": deal_inv_key,
                "deal_key": round_key,
                "investor_key": investor_key,
                "investor_id": state.record_ids[investor_key],
                "investor_name": investor_record["data"].get("canonical_name"),
                "company_key": company_key,
                "company_name": company_data.get("name"),
                "stage": stage,
                "raw_stage": round_data.get("round_stage"),
                "role": one_of(
                    deal_inv["data"].get("role"), ALLOWED_DEAL_ROLES, "unknown"
                ),
                "participation_status": one_of(
                    deal_inv["data"].get("participation_status"),
                    ALLOWED_PARTICIPATION,
                    "unknown",
                ),
                "announced_date": as_date(round_data.get("announced_date")),
                "amount_usd": round_data.get("amount_usd"),
                "classification": classification,
                "source_url": round_data.get("source_url"),
            }
        )
    return evidence


def maybe_add_manual_review_item(
    state: ImportState,
    *,
    company_key: str,
    round_key: str,
    company_data: dict[str, Any],
    round_data: dict[str, Any],
    classification: dict[str, Any],
) -> None:
    issue_type = classification.get("manual_review_issue_type") or "taxonomy_review"
    if any(
        item["record_key"] == company_key and item["issue_type"] == issue_type
        for item in state.manual_review_items
    ):
        return
    state.manual_review_items.append(
        {
            "source_table": "investee_company_profiles",
            "record_key": company_key,
            "related_record_key": round_key,
            "company_name": company_data.get("name")
            or round_data.get("investee_name_raw"),
            "issue_type": issue_type,
            "missing_dimensions": classification.get("missing_dimensions") or [],
            "source_payload": {
                "sector_primary": company_data.get("sector_primary"),
                "sector_secondary": company_data.get("sector_secondary"),
                "use_case_primary": company_data.get("use_case_primary"),
                "use_case_secondary": company_data.get("use_case_secondary"),
                "company_summary": company_data.get("company_summary"),
                "org_industries_raw": round_data.get("org_industries_raw"),
                "round_stage": round_data.get("round_stage"),
                "round_type_raw": round_data.get("round_type_raw"),
            },
            "suggested_action": (
                "Review source fields and either map them to an existing taxonomy "
                "code or add a new taxonomy alias/rule."
            ),
        }
    )


def insert_stage_preferences(
    connection: Connection, evidence: list[dict[str, Any]]
) -> dict[str, list[dict[str, Any]]]:
    by_investor_stage: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for item in evidence:
        if item["stage"] in CORE_STAGE_VALUES:
            by_investor_stage[(item["investor_key"], item["stage"])].append(item)

    generated_by_investor: dict[str, list[dict[str, Any]]] = defaultdict(list)
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM investor_actual_stage_preferences")

    for (investor_key, stage), items in sorted(by_investor_stage.items()):
        dates = [item["announced_date"] for item in items if item["announced_date"]]
        lead_count = sum(1 for item in items if item["role"] in {"lead", "co_lead"})
        participant_count = sum(1 for item in items if item["role"] == "participant")
        amounts = [
            float(item["amount_usd"])
            for item in items
            if item.get("amount_usd") not in (None, "")
        ]

        sector_dist = distribution(
            [
                (
                    item["classification"]["actual_sector"][:1],
                    item["classification"]["actual_sector"][1:],
                )
                for item in items
            ]
        )
        theme_dist = distribution(
            [
                (
                    item["classification"]["actual_themes"][:2],
                    item["classification"]["actual_themes"][2:],
                )
                for item in items
            ]
        )
        geography_dist = distribution(
            [(item["classification"]["geography"], []) for item in items]
        )
        business_dist = distribution(
            [([item["classification"]["business_model"]], []) for item in items]
        )
        customer_dist = distribution(
            [([item["classification"]["customer_type"]], []) for item in items]
        )
        ai_dist = distribution(
            [([item["classification"]["ai_relevance"]], []) for item in items]
        )
        tech_dist = distribution(
            [([item["classification"]["technology_depth"]], []) for item in items]
        )

        dimension_distributions = {
            "actual_sector": sector_dist,
            "actual_themes": theme_dist,
            "geography": geography_dist,
            "business_model": business_dist,
            "customer_type": customer_dist,
            "ai_relevance": ai_dist,
            "technology_depth": tech_dist,
            "raw_stage_values": Counter(item["raw_stage"] for item in items),
        }
        actual_sector = top_weighted(sector_dist, limit=5, min_weight=0.12)
        actual_themes = top_weighted(theme_dist, limit=8, min_weight=0.08)
        evidence_refs = [
            {
                "deal_key": item["deal_key"],
                "deal_investor_key": item["deal_investor_key"],
                "company": item["company_name"],
                "stage": item["stage"],
                "raw_stage": item["raw_stage"],
                "role": item["role"],
                "date": str(item["announced_date"]) if item["announced_date"] else None,
                "amount_usd": item.get("amount_usd"),
                "source_url": item.get("source_url"),
                "actual_sector": item["classification"]["actual_sector"],
                "actual_themes": item["classification"]["actual_themes"],
            }
            for item in items[:12]
        ]
        archetypes = []
        for sector in actual_sector[:3]:
            archetypes.append(
                {
                    "label": f"{stage} {sector} investor",
                    "weight": sector_dist["weighted"].get(sector, 0),
                    "evidence_count": (
                        sector_dist["raw"].get(sector, {}).get("as_primary", 0)
                        + sector_dist["raw"].get(sector, {}).get("as_secondary", 0)
                    ),
                }
            )
        if lead_count:
            archetypes.append(
                {
                    "label": f"{stage} lead investor",
                    "weight": round(lead_count / len(items), 4),
                    "evidence_count": lead_count,
                }
            )

        values = {
            "investor_id": state_id_from_key(investor_key, items),
            "stage": stage,
            "deals_count": len(items),
            "deals_window_start": min(dates) if dates else None,
            "deals_window_end": max(dates) if dates else None,
            "dimension_distributions": as_jsonb(dimension_distributions),
            "actual_archetypes": as_jsonb(archetypes),
            "lead_count": lead_count,
            "participant_count": participant_count,
            "leads_at_this_stage": lead_count > 0,
            "cheque_size_min_usd": min(amounts) if amounts else None,
            "cheque_size_max_usd": max(amounts) if amounts else None,
            "cheque_size_confidence": data_quality_for_count(len(amounts)),
            "recent_activity_score": recent_activity_score(dates),
            "matching_notes": stage_matching_notes(
                stage, items, actual_sector, actual_themes
            ),
            "evidence_refs": as_jsonb(evidence_refs),
            "no_evidence": False,
            "data_quality": data_quality_for_count(len(items)),
            "pipeline_version": PIPELINE_VERSION,
            "actual_sector": actual_sector,
            "actual_themes": actual_themes,
        }
        stage_pref_id = insert_returning_id(
            connection, "investor_actual_stage_preferences", values
        )
        generated_by_investor[investor_key].append(
            {
                "id": stage_pref_id,
                "stage": stage,
                "deals_count": len(items),
                "lead_count": lead_count,
                "actual_sector": actual_sector,
                "actual_themes": actual_themes,
                "dates": dates,
            }
        )

    connection.commit()
    return generated_by_investor


def state_id_from_key(investor_key: str, items: list[dict[str, Any]]) -> str:
    for item in items:
        if item["investor_key"] == investor_key:
            return item["investor_id"]
    raise RuntimeError(f"Missing investor_id for {investor_key}")


def stage_matching_notes(
    stage: str,
    items: list[dict[str, Any]],
    actual_sector: list[str],
    actual_themes: list[str],
) -> str:
    sectors = ", ".join(actual_sector[:3]) or "no promoted sector yet"
    themes = ", ".join(actual_themes[:4]) or "no promoted theme yet"
    lead_count = sum(1 for item in items if item["role"] in {"lead", "co_lead"})
    return (
        f"{len(items)} {stage} evidence deal(s); {lead_count} lead/co-lead. "
        f"Promoted sectors: {sectors}. Promoted themes: {themes}."
    )


def insert_investor_preferences(
    connection: Connection,
    state: ImportState,
    evidence: list[dict[str, Any]],
    stage_preferences: dict[str, list[dict[str, Any]]],
) -> None:
    by_investor: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in evidence:
        by_investor[item["investor_key"]].append(item)

    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM investor_actual_preferences")

    for investor_key, investor in sorted(state.records["investors"].items()):
        investor_id = state.record_ids[investor_key]
        all_items = by_investor.get(investor_key, [])
        used_items = [item for item in all_items if item["stage"] in CORE_STAGE_VALUES]
        dates = [
            item["announced_date"] for item in used_items if item["announced_date"]
        ]
        total_found = len(all_items)
        total_used = len(used_items)
        lead_count = sum(1 for item in all_items if item["role"] in {"lead", "co_lead"})
        participant_count = sum(
            1 for item in all_items if item["role"] == "participant"
        )
        follow_on_count = sum(
            1
            for item in all_items
            if item["participation_status"] in {"existing_investor", "follow_on"}
        )
        stage_coverage = {
            pref["stage"]: {
                "deals_count": pref["deals_count"],
                "lead_count": pref["lead_count"],
                "actual_sector": pref["actual_sector"],
                "actual_themes": pref["actual_themes"][:5],
            }
            for pref in stage_preferences.get(investor_key, [])
        }
        sector_counter: Counter[str] = Counter()
        theme_counter: Counter[str] = Counter()
        for pref in stage_preferences.get(investor_key, []):
            sector_counter.update(pref["actual_sector"])
            theme_counter.update(pref["actual_themes"])
        overall_archetypes = [
            {
                "label": f"{sector} evidence investor",
                "dimension": "actual_sector",
                "value": sector,
                "stage_count": count,
            }
            for sector, count in sector_counter.most_common(5)
        ]
        overall_archetypes.extend(
            {
                "label": f"{stage} evidence",
                "dimension": "stage",
                "value": stage,
                "deals_count": coverage["deals_count"],
            }
            for stage, coverage in sorted(
                stage_coverage.items(),
                key=lambda item: item[1]["deals_count"],
                reverse=True,
            )[:4]
        )
        web_profile = current_web_profile_for_investor(state, investor_key)
        claimed_vs_actual = {
            "claimed_stages": (web_profile.get("data", {}).get("claimed_stages") or [])
            if web_profile
            else [],
            "actual_stages": list(stage_coverage),
            "claimed_sectors": (
                web_profile.get("data", {}).get("claimed_sectors") or []
            )
            if web_profile
            else [],
            "actual_sector": [sector for sector, _ in sector_counter.most_common(8)],
            "actual_themes": [theme for theme, _ in theme_counter.most_common(10)],
            "note": "Sample deterministic comparison; empty claimed fields mean the website extraction did not provide structured claims.",
        }
        values = {
            "investor_id": investor_id,
            "total_deals_found": total_found,
            "total_deals_used": total_used,
            "deals_window_start": min(dates) if dates else None,
            "deals_window_end": max(dates) if dates else None,
            "stage_coverage": as_jsonb(stage_coverage),
            "lead_ratio": pct(lead_count, total_found),
            "participant_ratio": pct(participant_count, total_found),
            "follow_on_ratio": pct(follow_on_count, total_found),
            "activity_summary": investor_activity_summary(
                total_found, total_used, stage_coverage
            ),
            "overall_archetypes": as_jsonb(overall_archetypes),
            "claimed_vs_actual": as_jsonb(claimed_vs_actual),
            "data_quality": data_quality_for_count(total_used),
            "overall_confidence": confidence_for_count(total_used),
            "pipeline_version": PIPELINE_VERSION,
        }
        insert_investor_preference(connection, values)
    connection.commit()


def current_web_profile_for_investor(
    state: ImportState, investor_key: str
) -> dict[str, Any] | None:
    for profile in state.records["investor_web_profiles"].values():
        if (profile.get("refs") or {}).get("investor_key") == investor_key:
            return profile
    return None


def investor_activity_summary(
    total_found: int,
    total_used: int,
    stage_coverage: dict[str, Any],
) -> str:
    if total_used == 0:
        return (
            f"{total_found} imported deal(s), but none are in the core startup "
            "stage set used for matching."
        )
    stages = ", ".join(
        f"{stage} ({coverage['deals_count']})"
        for stage, coverage in sorted(
            stage_coverage.items(),
            key=lambda item: item[1]["deals_count"],
            reverse=True,
        )
    )
    return f"{total_used} core-stage deal(s) used for preferences: {stages}."


def insert_investor_preference(connection: Connection, values: dict[str, Any]) -> None:
    columns = list(values)
    placeholders = [sql.Placeholder(column) for column in columns]
    query = sql.SQL("INSERT INTO investor_actual_preferences ({}) VALUES ({})").format(
        sql.SQL(", ").join(sql.Identifier(column) for column in columns),
        sql.SQL(", ").join(placeholders),
    )
    connection.execute(query, values)


def insert_manual_review_items(connection: Connection, state: ImportState) -> None:
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM classification_manual_review_items")
        for item in state.manual_review_items:
            cursor.execute(
                """
                INSERT INTO classification_manual_review_items (
                  source_table,
                  record_key,
                  related_record_key,
                  company_name,
                  issue_type,
                  missing_dimensions,
                  source_payload,
                  suggested_action
                )
                VALUES (
                  %(source_table)s,
                  %(record_key)s,
                  %(related_record_key)s,
                  %(company_name)s,
                  %(issue_type)s,
                  %(missing_dimensions)s,
                  %(source_payload)s,
                  %(suggested_action)s
                )
                ON CONFLICT (source_table, record_key, issue_type) DO UPDATE SET
                  related_record_key = EXCLUDED.related_record_key,
                  company_name = EXCLUDED.company_name,
                  missing_dimensions = EXCLUDED.missing_dimensions,
                  source_payload = EXCLUDED.source_payload,
                  suggested_action = EXCLUDED.suggested_action,
                  status = 'pending',
                  updated_at = now()
                """,
                {**item, "source_payload": Jsonb(item["source_payload"])},
            )
    connection.commit()


def clear_formal_data(connection: Connection) -> None:
    tables = [
        "classification_manual_review_items",
        "investor_actual_preferences",
        "investor_actual_stage_preferences",
        "deal_investors",
        "funding_rounds",
        "investor_team_members",
        "investor_web_profiles",
        "investor_external_ids",
        "investee_external_ids",
        "investee_company_profiles",
        "investors",
    ]
    with connection.cursor() as cursor:
        for table in tables:
            cursor.execute(
                """
                SELECT to_regclass(%s) IS NOT NULL AS exists
                """,
                (f"public.{table}",),
            )
            row = cursor.fetchone()
            if row and row[0]:
                cursor.execute(
                    sql.SQL("DELETE FROM {}.{}").format(
                        sql.Identifier("public"),
                        sql.Identifier(table),
                    )
                )
    connection.commit()


def sync_mvp_compat_from_formal(connection: Connection) -> dict[str, int]:
    """Project formal public.* data into mvp_compat for the current local UI/API."""

    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT
              i.id::text,
              i.canonical_name,
              i.investor_type::text,
              i.website_url,
              i.linkedin_url,
              i.hq_country,
              i.hq_state,
              i.hq_city,
              ap.total_deals_used,
              ap.activity_summary,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'stage', sp.stage::text,
                    'deals_count', sp.deals_count,
                    'lead_count', sp.lead_count,
                    'leads_at_this_stage', sp.leads_at_this_stage,
                    'actual_sector', sp.actual_sector,
                    'actual_themes', sp.actual_themes,
                    'cheque_size_min_usd', sp.cheque_size_min_usd,
                    'cheque_size_max_usd', sp.cheque_size_max_usd,
                    'evidence_refs', sp.evidence_refs
                  )
                ) FILTER (WHERE sp.id IS NOT NULL),
                '[]'::jsonb
              ) AS stage_preferences
            FROM public.investors i
            LEFT JOIN public.investor_actual_preferences ap
              ON ap.investor_id = i.id
            LEFT JOIN public.investor_actual_stage_preferences sp
              ON sp.investor_id = i.id AND sp.deleted_at IS NULL
            WHERE i.deleted_at IS NULL
            GROUP BY
              i.id,
              i.canonical_name,
              i.investor_type,
              i.website_url,
              i.linkedin_url,
              i.hq_country,
              i.hq_state,
              i.hq_city,
              ap.total_deals_used,
              ap.activity_summary
            ORDER BY i.canonical_name
            """
        )
        rows = [dict(row) for row in cursor.fetchall()]

    seen_slugs: Counter[str] = Counter()
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM mvp_compat.rag_chunks")
        cursor.execute("DELETE FROM mvp_compat.investors")

        for row in rows:
            base_slug = slugify(row["canonical_name"])
            seen_slugs[base_slug] += 1
            slug = (
                base_slug
                if seen_slugs[base_slug] == 1
                else f"{base_slug}-{seen_slugs[base_slug]}"
            )
            stage_preferences = row.get("stage_preferences") or []
            stage_focus = sorted(
                {pref.get("stage") for pref in stage_preferences if pref.get("stage")}
            )
            sector_focus = sorted(
                {
                    sector
                    for pref in stage_preferences
                    for sector in pref.get("actual_sector", [])
                }
            )
            theme_focus = sorted(
                {
                    theme
                    for pref in stage_preferences
                    for theme in pref.get("actual_themes", [])
                }
            )
            geography_focus = [
                value for value in ["ANZ", row.get("hq_country")] if value
            ]
            cheque_ranges = []
            for pref in stage_preferences:
                if (
                    pref.get("cheque_size_min_usd") is None
                    and pref.get("cheque_size_max_usd") is None
                ):
                    continue
                cheque_ranges.append(
                    {
                        "stage": pref.get("stage"),
                        "amount_min": pref.get("cheque_size_min_usd"),
                        "amount_max": pref.get("cheque_size_max_usd"),
                        "currency": "USD",
                        "basis": "actual_deal_evidence",
                        "hard_filter_safe": False,
                    }
                )
            recent_deals = compact_recent_deals(stage_preferences)
            lead_behavior = (
                "leads_and_follows"
                if any(pref.get("lead_count", 0) for pref in stage_preferences)
                else "follows_only"
            )
            cursor.execute(
                """
                INSERT INTO mvp_compat.investors (
                  id,
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
                  screening_notes
                )
                VALUES (
                  gen_random_uuid(),
                  %(name)s,
                  %(slug)s,
                  %(investor_type)s,
                  %(website_url)s,
                  %(linkedin_url)s,
                  %(hq_country)s,
                  %(hq_state)s,
                  %(hq_city)s,
                  %(stage_focus)s,
                  %(sector_focus)s,
                  %(geography_focus)s,
                  %(business_model_focus)s,
                  %(founder_fit)s,
                  %(cheque_ranges)s,
                  %(lead_behavior)s,
                  %(ai_appetite)s,
                  %(recent_deals)s,
                  %(entry_channels)s,
                  %(preferred_channel)s,
                  %(screening_status)s,
                  %(screening_priority)s,
                  %(screening_notes)s
                )
                RETURNING id::text
                """,
                {
                    "name": row["canonical_name"],
                    "slug": slug,
                    "investor_type": row.get("investor_type"),
                    "website_url": row.get("website_url"),
                    "linkedin_url": row.get("linkedin_url"),
                    "hq_country": row.get("hq_country"),
                    "hq_state": row.get("hq_state"),
                    "hq_city": row.get("hq_city"),
                    "stage_focus": stage_focus,
                    "sector_focus": sector_focus,
                    "geography_focus": geography_focus,
                    "business_model_focus": theme_focus[:12],
                    "founder_fit": [],
                    "cheque_ranges": Jsonb(cheque_ranges),
                    "lead_behavior": lead_behavior,
                    "ai_appetite": "unknown",
                    "recent_deals": Jsonb(recent_deals),
                    "entry_channels": [],
                    "preferred_channel": None,
                    "screening_status": "screened",
                    "screening_priority": "high"
                    if (row.get("total_deals_used") or 0) >= 2
                    else "medium",
                    "screening_notes": row.get("activity_summary"),
                },
            )
            investor_id = cursor.fetchone()[0]
            insert_compat_chunks(
                cursor,
                investor_id=investor_id,
                slug=slug,
                row=row,
                stage_focus=stage_focus,
                sector_focus=sector_focus,
                theme_focus=theme_focus,
                recent_deals=recent_deals,
            )

    connection.commit()
    return {
        "mvp_compat_investors": len(rows),
        "mvp_compat_rag_chunks": len(rows)
        + sum(
            len(compact_recent_deals(row.get("stage_preferences") or []))
            for row in rows
        ),
    }


def drop_mvp_compat_schema(connection: Connection) -> None:
    """Remove the retired MVP compatibility schema from a formal local DB."""

    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database()")
        database_name = cursor.fetchone()[0]
        cursor.execute(
            sql.SQL("ALTER DATABASE {} SET search_path = public").format(
                sql.Identifier(database_name)
            )
        )
        cursor.execute("DROP SCHEMA IF EXISTS mvp_compat CASCADE")
    connection.commit()


def compact_recent_deals(
    stage_preferences: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    deals = []
    seen: set[str] = set()
    for pref in stage_preferences:
        for evidence in pref.get("evidence_refs") or []:
            deal_key = str(evidence.get("deal_key") or "")
            if not deal_key or deal_key in seen:
                continue
            seen.add(deal_key)
            deals.append(
                {
                    "company": evidence.get("company"),
                    "round": evidence.get("stage") or evidence.get("raw_stage"),
                    "amount": evidence.get("amount_usd"),
                    "amount_text": f"US${evidence.get('amount_usd')}"
                    if evidence.get("amount_usd") is not None
                    else None,
                    "role": evidence.get("role"),
                    "date": evidence.get("date"),
                    "company_geography": "ANZ",
                    "direction": ", ".join(evidence.get("actual_themes") or []),
                    "business_model": ", ".join(evidence.get("actual_sector") or []),
                    "investor_evidence_url": evidence.get("source_url"),
                }
            )
            if len(deals) >= 12:
                return deals
    return deals


def insert_compat_chunks(
    cursor: Any,
    *,
    investor_id: str,
    slug: str,
    row: dict[str, Any],
    stage_focus: list[str],
    sector_focus: list[str],
    theme_focus: list[str],
    recent_deals: list[dict[str, Any]],
) -> None:
    profile_text = (
        f"{row['canonical_name']} investor profile. "
        f"Actual stages: {', '.join(stage_focus) or 'none'}. "
        f"Actual sectors: {', '.join(sector_focus) or 'none'}. "
        f"Actual themes: {', '.join(theme_focus[:16]) or 'none'}. "
        f"Activity: {row.get('activity_summary') or 'No core-stage evidence'}."
    )
    cursor.execute(
        """
        INSERT INTO mvp_compat.rag_chunks (
          investor_id,
          investor_slug,
          entity_type,
          entity_id,
          section_key,
          chunk_text,
          source_urls,
          metadata,
          confidence,
          review_needed,
          rag_allowed
        )
        VALUES (%s, %s, 'investor', %s, 'actual_preference_profile', %s, %s, %s, 'medium', false, true)
        """,
        (
            investor_id,
            slug,
            f"investor:{slug}",
            profile_text,
            [],
            Jsonb(
                {
                    "source": "formal_actual_preferences",
                    "stage_focus": stage_focus,
                    "sector_focus": sector_focus,
                    "theme_focus": theme_focus,
                }
            ),
        ),
    )
    for index, deal in enumerate(recent_deals, start=1):
        cursor.execute(
            """
            INSERT INTO mvp_compat.rag_chunks (
              investor_id,
              investor_slug,
              entity_type,
              entity_id,
              section_key,
              chunk_text,
              source_urls,
              metadata,
              confidence,
              review_needed,
              rag_allowed
            )
            VALUES (%s, %s, 'deal', %s, 'recent_deal', %s, %s, %s, 'medium', false, true)
            """,
            (
                investor_id,
                slug,
                f"{slug}:deal:{index}",
                (
                    f"{row['canonical_name']} actual deal evidence. "
                    f"Company: {deal.get('company') or 'unknown'}. "
                    f"Round: {deal.get('round') or 'unknown'}. "
                    f"Role: {deal.get('role') or 'unknown'}. "
                    f"Themes: {deal.get('direction') or 'unknown'}."
                ),
                [deal["investor_evidence_url"]]
                if deal.get("investor_evidence_url")
                else [],
                Jsonb(deal),
            ),
        )


def collect_summary(connection: Connection, state: ImportState) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "pipeline_version": PIPELINE_VERSION,
        "taxonomy": {
            "layer_1": TAXONOMY_LAYER_1,
            "layer_2_by_layer_1": TAXONOMY_LAYER_2_BY_LAYER_1,
            "layer_2_codes": sorted(CANONICAL_THEME_CODES),
            "raw_layer_2_rule_count": len({theme for theme, _ in THEME_RULES}),
        },
    }
    tables = [
        "investors",
        "investor_external_ids",
        "investor_web_profiles",
        "investor_team_members",
        "investee_company_profiles",
        "investee_external_ids",
        "funding_rounds",
        "deal_investors",
        "investor_actual_preferences",
        "investor_actual_stage_preferences",
        "classification_manual_review_items",
    ]
    with connection.cursor(row_factory=dict_row) as cursor:
        counts = {}
        for table in tables:
            cursor.execute(
                sql.SQL("SELECT count(*) AS count FROM {}").format(
                    sql.Identifier(table)
                )
            )
            counts[table] = int(cursor.fetchone()["count"])
        summary["counts"] = counts
        cursor.execute(
            """
            SELECT round_stage, round_type_raw, count(*) AS count
            FROM funding_rounds
            GROUP BY round_stage, round_type_raw
            ORDER BY count DESC, round_stage, round_type_raw
            """
        )
        summary["round_stage_mapping"] = [dict(row) for row in cursor.fetchall()]
        cursor.execute(
            """
            SELECT i.canonical_name, p.stage, p.deals_count, p.lead_count,
                   p.actual_sector, p.actual_themes, p.matching_notes
            FROM investor_actual_stage_preferences p
            JOIN investors i ON i.id = p.investor_id
            ORDER BY p.deals_count DESC, p.lead_count DESC, i.canonical_name
            LIMIT 25
            """
        )
        summary["top_stage_preferences"] = [dict(row) for row in cursor.fetchall()]
        cursor.execute(
            """
            SELECT i.canonical_name, p.total_deals_found, p.total_deals_used,
                   p.lead_ratio, p.data_quality, p.overall_confidence,
                   p.stage_coverage, p.activity_summary
            FROM investor_actual_preferences p
            JOIN investors i ON i.id = p.investor_id
            ORDER BY p.total_deals_used DESC, p.total_deals_found DESC, i.canonical_name
            LIMIT 25
            """
        )
        summary["top_investor_preferences"] = [dict(row) for row in cursor.fetchall()]
        cursor.execute(
            """
            SELECT actual_sector, count(*) AS rows
            FROM (
              SELECT unnest(actual_sector) AS actual_sector
              FROM investor_actual_stage_preferences
            ) sector_rows
            GROUP BY actual_sector
            ORDER BY rows DESC, actual_sector
            """
        )
        summary["actual_sector_frequency"] = [dict(row) for row in cursor.fetchall()]
        cursor.execute(
            """
            SELECT actual_theme, count(*) AS rows
            FROM (
              SELECT unnest(actual_themes) AS actual_theme
              FROM investor_actual_stage_preferences
            ) theme_rows
            GROUP BY actual_theme
            ORDER BY rows DESC, actual_theme
            LIMIT 50
            """
        )
        summary["actual_theme_frequency"] = [dict(row) for row in cursor.fetchall()]
        cursor.execute(
            """
            SELECT issue_type, missing_dimensions, count(*) AS rows
            FROM classification_manual_review_items
            GROUP BY issue_type, missing_dimensions
            ORDER BY rows DESC, issue_type
            """
        )
        summary["manual_review_frequency"] = [dict(row) for row in cursor.fetchall()]
        cursor.execute(
            """
            SELECT company_name, issue_type, missing_dimensions, source_payload
            FROM classification_manual_review_items
            ORDER BY created_at DESC, company_name
            LIMIT 50
            """
        )
        summary["manual_review_items"] = [dict(row) for row in cursor.fetchall()]

    summary["skipped"] = dict(state.skipped)
    return summary


def import_all(connection: Connection, source_dirs: list[Path]) -> ImportState:
    state = ImportState(
        record_ids={},
        records=defaultdict(dict),
        skipped=Counter(),
        manual_review_items=[],
    )
    import_investors(
        connection, load_envelopes_many(source_dirs, "investors", state), state
    )
    import_investor_web_profiles(
        connection,
        load_envelopes_many(source_dirs, "investor_web_profiles", state),
        state,
    )
    import_investor_team_members(
        connection,
        load_envelopes_many(source_dirs, "investor_team_members", state),
        state,
    )
    import_investee_profiles(
        connection,
        load_envelopes_many(source_dirs, "investee_company_profiles", state),
        state,
    )
    import_external_ids(
        connection,
        load_envelopes_many(source_dirs, "investor_external_ids", state),
        state,
        table="investor_external_ids",
        ref_key="investor_key",
        fk_column="investor_id",
    )
    import_external_ids(
        connection,
        load_envelopes_many(source_dirs, "investee_external_ids", state),
        state,
        table="investee_external_ids",
        ref_key="investee_company_key",
        fk_column="investee_company_id",
    )
    import_funding_rounds(
        connection,
        load_envelopes_many(source_dirs, "funding_rounds", state),
        state,
    )
    import_deal_investors(
        connection,
        load_envelopes_many(source_dirs, "deal_investors", state),
        state,
    )
    connection.commit()
    evidence = build_deal_evidence(state)
    stage_preferences = insert_stage_preferences(connection, evidence)
    insert_investor_preferences(connection, state, evidence, stage_preferences)
    insert_manual_review_items(connection, state)
    return state


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create and populate a formal-schema sample VC matching DB."
    )
    parser.add_argument(
        "--source-dir",
        required=True,
        type=Path,
        action="append",
        help="Filtered recent-deal package directory. Pass multiple times to merge.",
    )
    parser.add_argument("--database-url", default=DEFAULT_DATABASE_URL)
    parser.add_argument("--admin-url", default=DEFAULT_ADMIN_URL)
    parser.add_argument("--schema-file", default=DEFAULT_SCHEMA_FILE, type=Path)
    parser.add_argument("--patch-file", default=DEFAULT_PATCH_FILE, type=Path)
    parser.add_argument("--summary-file", default=DEFAULT_SUMMARY_FILE, type=Path)
    parser.add_argument("--recreate-database", action="store_true")
    parser.add_argument(
        "--skip-schema",
        action="store_true",
        help="Do not apply the base schema; useful for an existing local database.",
    )
    parser.add_argument(
        "--clear-existing-data",
        action="store_true",
        help="Delete existing formal evidence/preference rows before importing.",
    )
    parser.add_argument(
        "--sync-mvp-compat",
        action="store_true",
        help="Project formal data into mvp_compat for the current local UI/API.",
    )
    args = parser.parse_args()

    if args.recreate_database:
        recreate_database(args.admin_url, args.database_url)

    with connect(args.database_url) as connection:
        use_public_schema(connection)
        if not args.skip_schema:
            apply_sql_file(connection, args.schema_file)
        apply_sql_file(connection, args.patch_file)
        if args.clear_existing_data:
            clear_formal_data(connection)
        state = import_all(connection, args.source_dir)
        compat_counts = (
            sync_mvp_compat_from_formal(connection) if args.sync_mvp_compat else {}
        )
        if not args.sync_mvp_compat:
            drop_mvp_compat_schema(connection)
        summary = collect_summary(connection, state)
        if compat_counts:
            summary["compat_counts"] = compat_counts

    args.summary_file.parent.mkdir(parents=True, exist_ok=True)
    args.summary_file.write_text(
        json.dumps(summary, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    print(json.dumps(summary["counts"], indent=2, ensure_ascii=False))
    print(f"Summary written to {args.summary_file}")


if __name__ == "__main__":
    main()

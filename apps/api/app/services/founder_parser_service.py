"""Parse founder/company chat input into a structured matching profile."""

from __future__ import annotations

import argparse
import json
from typing import Any

from app.providers.llm import LLMClient
from app.services.matching_taxonomy import (
    ALLOWED_SECTORS,
    ALLOWED_THEMES,
    format_taxonomy_for_prompt,
    normalize_customer_type_code,
    themes_for_sectors,
)

MAX_FOUNDER_SECTORS = 2
MAX_PRIMARY_THEMES = 1
MAX_SECONDARY_THEMES = 2
MAX_FOUNDER_THEMES = MAX_PRIMARY_THEMES + MAX_SECONDARY_THEMES
MAX_CUSTOMER_TYPES = 3
MAX_BUSINESS_MODELS = 3

SECTOR_ORDER = [
    "healthcare_life_sciences",
    "resources_mining_metals",
    "energy_climate",
    "aerospace_space_defence",
    "fintech_financial_services",
    "enterprise_software_data_security",
    "education_workforce",
    "industrial_robotics_automation",
    "food_agriculture",
    "transport_logistics_infrastructure",
    "property_construction",
    "consumer_marketplace",
]

SECTOR_PASS_SYSTEM_PROMPT = f"""You extract founder/company fields for VC matching.

Return only valid JSON. Do not include Markdown.
Use null when a field is not available from the user text.
Do not invent facts.
Preserve numeric amounts exactly. For example:
- "A$2.5m" means target_raise_value 2.5, target_raise_currency "AUD",
  target_raise_unit "million".
- "$750k" means target_raise_value 750, target_raise_unit "thousand".
Confirmed/committed capital is separate from the target raise. Use zero when
the user explicitly says none is committed, and null when it is not provided.
Primary market is geographic, such as "Australia", "New Zealand", "ANZ",
"US", or "Global".
Do not put business model labels such as B2B or B2C in primary_market.

For customer_types, return 1-3 values from:
consumer, smb, mid_market, enterprise, developer, healthcare_provider,
government, education_institution, other.
Put the first customer_types value in customer_type for backwards compatibility.
Map B2B to enterprise and B2C to consumer.

For business_models, return 1-3 business model codes explicitly supported by
the user text. Put the first business_models value in business_model for
backwards compatibility.

For actual_sector, choose 1-2 codes from this closed list only:
{chr(10).join(f"- {sector}" for sector in SECTOR_ORDER)}

Treat AI as a modifier, not a primary sector, unless the product is AI
infrastructure or model infrastructure.
Do not select actual_themes in this pass.

Required JSON keys:
- company_name
- company_hq_country
- primary_market
- founder_au_anz_connection
- stage
- round_type
- target_raise_value
- target_raise_currency
- target_raise_unit
- committed_capital_value
- committed_capital_currency
- committed_capital_unit
- sector
- actual_sector
- customer_type
- customer_types
- business_model
- business_models
- sales_motion
- technology_depth
- ai_relevance
- ai_usage_type
- ai_core_or_enabler
- lead_needed
- warm_intro_available
- traction_summary
- one_sentence_summary
- missing_information
"""


def build_theme_pass_system_prompt(sectors: list[str]) -> str:
    taxonomy = format_taxonomy_for_prompt(sectors=sectors)
    return f"""You assign formal investment themes for a founder profile.

Return only valid JSON. Do not include Markdown.
Use only theme codes from the allowed list for the selected sectors below.
Never invent theme codes.

Rules:
1. Choose exactly 1 primary theme in primary_themes.
2. Optionally choose up to 2 secondary themes in secondary_themes.
3. Prefer themes strongly supported by the founder description.
4. Do not choose an extremely narrow theme when a broader supported theme in
   the same sector is also clearly applicable.
5. Secondary themes should be related alternatives, not random extras.
6. Total themes across primary_themes + secondary_themes must be 1-3.

Selected sectors and allowed themes:
{taxonomy}

Required JSON keys:
- primary_themes
- secondary_themes
- actual_themes
"""


def _as_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        text = value.strip()
        return [text] if text else []
    if isinstance(value, (list, tuple)):
        items: list[str] = []
        for item in value:
            if isinstance(item, dict):
                code = item.get("code") or item.get("theme")
                text = str(code).strip() if code is not None else ""
            else:
                text = str(item).strip()
            if text:
                items.append(text)
        return items
    return []


def _clamp_themes(themes: list[str], allowed: set[str], limit: int) -> list[str]:
    clamped = [
        theme for theme in themes if theme in allowed and theme in ALLOWED_THEMES
    ]
    return list(dict.fromkeys(clamped))[:limit]


def normalize_parsed_founder_profile(profile: dict[str, Any]) -> dict[str, Any]:
    """Clamp taxonomy fields to the closed formal vocabulary."""
    normalized = dict(profile)

    sectors = [
        sector
        for sector in _as_string_list(normalized.get("actual_sector"))
        if sector in ALLOWED_SECTORS
    ]
    sectors = list(dict.fromkeys(sectors))[:MAX_FOUNDER_SECTORS]
    normalized["actual_sector"] = sectors

    allowed_themes = (
        set(themes_for_sectors(sectors)) if sectors else set(ALLOWED_THEMES)
    )

    primary = _clamp_themes(
        _as_string_list(normalized.get("primary_themes")),
        allowed_themes,
        MAX_PRIMARY_THEMES,
    )
    secondary = _clamp_themes(
        [
            theme
            for theme in _as_string_list(normalized.get("secondary_themes"))
            if theme not in primary
        ],
        allowed_themes,
        MAX_SECONDARY_THEMES,
    )

    # Back-compat: if only actual_themes was provided, split primary/secondary.
    if not primary and not secondary:
        legacy = _clamp_themes(
            _as_string_list(normalized.get("actual_themes")),
            allowed_themes,
            MAX_FOUNDER_THEMES,
        )
        primary = legacy[:MAX_PRIMARY_THEMES]
        secondary = legacy[MAX_PRIMARY_THEMES:]

    themes = (primary + secondary)[:MAX_FOUNDER_THEMES]
    normalized["primary_themes"] = primary
    normalized["secondary_themes"] = secondary
    normalized["actual_themes"] = themes

    raw_customer_types = _as_string_list(normalized.get("customer_types"))
    if not raw_customer_types:
        raw_customer_types = _as_string_list(normalized.get("customer_type"))
    customer_types = [
        customer_type
        for value in raw_customer_types
        if (customer_type := normalize_customer_type_code(value))
    ]
    customer_types = list(dict.fromkeys(customer_types))[:MAX_CUSTOMER_TYPES]
    normalized["customer_types"] = customer_types
    normalized["customer_type"] = customer_types[0] if customer_types else None

    raw_business_models = _as_string_list(normalized.get("business_models"))
    if not raw_business_models:
        raw_business_models = _as_string_list(normalized.get("business_model"))
    business_models = list(dict.fromkeys(raw_business_models))[:MAX_BUSINESS_MODELS]
    normalized["business_models"] = business_models
    normalized["business_model"] = business_models[0] if business_models else None

    return normalized


def _parse_sector_pass(message: str, llm: LLMClient) -> dict[str, Any]:
    parsed = llm.generate_json(
        system=SECTOR_PASS_SYSTEM_PROMPT,
        user=f"Founder/company description:\n\n{message}",
        max_tokens=900,
    )
    if not isinstance(parsed, dict):
        raise ValueError("Founder sector pass did not return a JSON object")
    return parsed


def _parse_theme_pass(
    message: str,
    sector_profile: dict[str, Any],
    llm: LLMClient,
) -> dict[str, Any]:
    sectors = [
        sector
        for sector in _as_string_list(sector_profile.get("actual_sector"))
        if sector in ALLOWED_SECTORS
    ][:MAX_FOUNDER_SECTORS]
    if not sectors:
        return {
            "primary_themes": [],
            "secondary_themes": [],
            "actual_themes": [],
        }

    summary = sector_profile.get("one_sentence_summary") or ""
    sector_text = sector_profile.get("sector") or ""
    parsed = llm.generate_json(
        system=build_theme_pass_system_prompt(sectors),
        user=(
            "Founder/company description:\n\n"
            f"{message}\n\n"
            "Sector-pass context:\n"
            f"- actual_sector: {json.dumps(sectors)}\n"
            f"- sector: {sector_text}\n"
            f"- one_sentence_summary: {summary}\n"
        ),
        max_tokens=500,
    )
    if not isinstance(parsed, dict):
        raise ValueError("Founder theme pass did not return a JSON object")
    return parsed


def parse_founder_message(message: str, client: LLMClient | None = None) -> dict:
    """Two-pass parse: sectors/profile first, then sector-gated themes."""
    llm = client or LLMClient()
    sector_profile = _parse_sector_pass(message, llm)
    theme_profile = _parse_theme_pass(message, sector_profile, llm)
    merged = {**sector_profile, **theme_profile}
    return normalize_parsed_founder_profile(merged)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse founder/company input with the configured LLM"
    )
    parser.add_argument(
        "message", nargs="+", help="Founder/company free-text description"
    )
    args = parser.parse_args()

    parsed = parse_founder_message(" ".join(args.message))
    print(json.dumps(parsed, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

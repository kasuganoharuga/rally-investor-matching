"""Parse founder/company chat input into a structured matching profile."""

from __future__ import annotations

import argparse
import json

from app.providers.llm import LLMClient

SYSTEM_PROMPT = """You extract founder/company profiles for VC matching.

Return only valid JSON. Do not include Markdown.

Use null when a field is not available from the user text.
Do not invent facts.
Preserve numeric amounts exactly. For example:
- "A$2.5m" means target_raise_value 2.5, target_raise_currency "AUD",
  target_raise_unit "million".
- "$750k" means target_raise_value 750, target_raise_unit "thousand".
- Do not drop leading digits from decimal amounts.
Primary market is geographic, such as "Australia", "New Zealand", "ANZ",
"US", or "Global".
Do not put business model labels such as B2B or B2C in primary_market.

For actual_sector, choose zero or more from:
- healthcare_life_sciences
- resources_mining_metals
- energy_climate
- aerospace_space_defence
- fintech_financial_services
- enterprise_software_data_security
- education_workforce
- industrial_robotics_automation
- food_agriculture
- transport_logistics_infrastructure
- property_construction
- consumer_marketplace

For actual_themes, use precise snake_case themes when clear, such as:
medical_devices, diagnostics, digital_health_care_coordination,
accessibility_assistive_technology, digital_health_infrastructure,
wellness_mental_health, critical_minerals, battery_storage,
renewable_distributed_energy, nature_biodiversity_finance,
energy_infrastructure, biomaterials_sustainable_materials,
space_launch_transport, satellite_space_systems, defence_dual_use,
payments_settlement, digital_assets_web3, wealth_asset_management,
capital_markets_trading_infrastructure, retail_investing_platforms,
capital_formation_crowdfunding, consumer_finance_banking,
enterprise_data_platforms, content_design_tools, data_privacy_security,
ai_compute_infrastructure, product_analytics_user_research,
sales_marketing_intelligence, vertical_business_operations,
customer_support_contact_center, legaltech_contract_workflows,
developer_tools_app_platforms, compliance_risk_workflows,
ai_governance_security, proposal_tender_workflows, cloud_finops,
autonomous_navigation_systems, industrial_robotics,
asset_maintenance_fleet_management, agtech_farm_management,
aquaculture_seafood, logistics_supply_chain,
real_estate_construction_workflows, property_transaction_workflows,
marketplace_commerce, pet_care_nutrition.

Treat AI as a modifier, not a primary sector, unless the product is AI
infrastructure or model infrastructure.

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
- sector
- actual_sector
- actual_themes
- customer_type
- business_model
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


def parse_founder_message(message: str, client: LLMClient | None = None) -> dict:
    llm = client or LLMClient()
    return llm.generate_json(
        system=SYSTEM_PROMPT,
        user=f"Founder/company description:\n\n{message}",
        max_tokens=900,
    )


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

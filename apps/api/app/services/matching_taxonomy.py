"""Closed formal taxonomy for founder parsing and theme scoring.

Source of truth: data/generated/actual_theme_taxonomy.md
(formal-sample-2026-07-18-v6) — 12 sectors, 125 themes.
"""

from __future__ import annotations

SECTOR_THEMES: dict[str, tuple[str, ...]] = {
    "healthcare_life_sciences": (
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
    ),
    "resources_mining_metals": (
        "critical_minerals",
        "rare_earths",
        "base_precious_metals",
        "bulk_commodities",
        "mineral_exploration_drilling",
        "mine_development_production",
        "mineral_processing",
        "gas_resources",
        "mining_workflow_software",
    ),
    "energy_climate": (
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
    ),
    "aerospace_space_defence": (
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
    ),
    "fintech_financial_services": (
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
    ),
    "enterprise_software_data_security": (
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
    ),
    "education_workforce": (
        "education_training_platforms",
        "career_skills_verification",
    ),
    "industrial_robotics_automation": (
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
    ),
    "food_agriculture": (
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
    ),
    "transport_logistics_infrastructure": (
        "airport_operations",
        "road_freight_mobility",
        "logistics_supply_chain",
        "maritime_transport",
        "transport_energy_fuel",
        "infrastructure_operations_connectivity",
    ),
    "property_construction": (
        "property_transaction_workflows",
        "construction_payments_finance",
        "building_materials",
        "prefabricated_sustainable_buildings",
        "real_estate_construction_workflows",
    ),
    "consumer_marketplace": (
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
    ),
}

ALLOWED_SECTORS: frozenset[str] = frozenset(SECTOR_THEMES)
ALLOWED_THEMES: frozenset[str] = frozenset(
    theme for themes in SECTOR_THEMES.values() for theme in themes
)

THEME_TO_SECTOR: dict[str, str] = {
    theme: sector for sector, themes in SECTOR_THEMES.items() for theme in themes
}

# Directed relatedness for theme_fit partial credit.
# Curated within-sector clusters (not all same-sector pairs).
# Weights are similarity strengths in (0, 1); scoring maps them to points.
THEME_RELATIONS: dict[str, dict[str, float]] = {
    # Healthcare
    "digital_health_infrastructure": {
        "digital_health_care_coordination": 0.75,
        "clinical_decision_support": 0.65,
        "remote_patient_monitoring": 0.55,
        "diagnostics": 0.4,
        "medical_devices": 0.35,
    },
    "digital_health_care_coordination": {
        "digital_health_infrastructure": 0.75,
        "clinical_decision_support": 0.55,
        "remote_patient_monitoring": 0.55,
        "preventive_chronic_care": 0.45,
        "womens_maternal_health": 0.35,
    },
    "clinical_decision_support": {
        "digital_health_infrastructure": 0.65,
        "diagnostics": 0.55,
        "digital_health_care_coordination": 0.55,
    },
    "diagnostics": {
        "medical_devices": 0.7,
        "biotech_life_sciences": 0.55,
        "clinical_decision_support": 0.5,
        "digital_health_infrastructure": 0.4,
    },
    "medical_devices": {
        "diagnostics": 0.7,
        "biotech_life_sciences": 0.45,
        "neurotechnology": 0.45,
        "remote_patient_monitoring": 0.4,
    },
    "biotech_life_sciences": {
        "diagnostics": 0.55,
        "drug_delivery": 0.6,
        "biomanufacturing_fermentation": 0.55,
        "medical_devices": 0.45,
    },
    "drug_delivery": {
        "biotech_life_sciences": 0.6,
        "biomanufacturing_fermentation": 0.45,
    },
    "remote_patient_monitoring": {
        "digital_health_care_coordination": 0.55,
        "preventive_chronic_care": 0.5,
        "medical_devices": 0.4,
    },
    "preventive_chronic_care": {
        "womens_maternal_health": 0.45,
        "wellness_mental_health": 0.4,
        "remote_patient_monitoring": 0.5,
    },
    "wellness_mental_health": {
        "preventive_chronic_care": 0.4,
        "accessibility_assistive_technology": 0.35,
    },
    "accessibility_assistive_technology": {
        "neurotechnology": 0.4,
        "medical_devices": 0.35,
    },
    # Resources / mining
    "critical_minerals": {
        "rare_earths": 0.7,
        "mineral_exploration_drilling": 0.55,
        "mineral_processing": 0.5,
        "mine_development_production": 0.45,
    },
    "rare_earths": {
        "critical_minerals": 0.7,
        "mineral_processing": 0.5,
    },
    "mineral_exploration_drilling": {
        "mine_development_production": 0.65,
        "critical_minerals": 0.55,
        "base_precious_metals": 0.45,
    },
    "mine_development_production": {
        "mineral_exploration_drilling": 0.65,
        "mineral_processing": 0.55,
        "bulk_commodities": 0.4,
    },
    "mineral_processing": {
        "critical_minerals": 0.5,
        "mine_development_production": 0.55,
        "mining_workflow_software": 0.4,
    },
    "mining_workflow_software": {
        "mineral_processing": 0.4,
        "mine_development_production": 0.35,
    },
    "gas_resources": {
        "energy_infrastructure": 0.45,
        "bulk_commodities": 0.35,
    },
    # Energy / climate
    "battery_storage": {
        "renewable_distributed_energy": 0.65,
        "electrification_ev_fleet": 0.55,
        "solar_building_energy": 0.45,
    },
    "renewable_distributed_energy": {
        "battery_storage": 0.65,
        "solar_building_energy": 0.7,
        "energy_infrastructure": 0.5,
    },
    "solar_building_energy": {
        "renewable_distributed_energy": 0.7,
        "battery_storage": 0.45,
    },
    "industrial_decarbonisation": {
        "clean_chemicals_fertiliser": 0.5,
        "circular_waste_recycling": 0.45,
        "sustainable_fuels_hydrogen": 0.5,
        "environmental_services": 0.4,
    },
    "circular_waste_recycling": {
        "biomaterials_sustainable_materials": 0.5,
        "environmental_services": 0.55,
        "industrial_decarbonisation": 0.45,
    },
    "nature_biodiversity_finance": {
        "environmental_services": 0.5,
        "industrial_decarbonisation": 0.35,
    },
    "sustainable_fuels_hydrogen": {
        "industrial_decarbonisation": 0.5,
        "electrification_ev_fleet": 0.4,
        "energy_infrastructure": 0.4,
    },
    "energy_infrastructure": {
        "renewable_distributed_energy": 0.5,
        "electrification_ev_fleet": 0.4,
    },
    # Aerospace / defence
    "satellite_space_systems": {
        "space_launch_transport": 0.65,
        "in_orbit_servicing": 0.6,
        "navigation_pnt_systems": 0.55,
        "mission_infrastructure": 0.5,
    },
    "space_launch_transport": {
        "satellite_space_systems": 0.65,
        "mission_infrastructure": 0.55,
        "aerospace_materials": 0.4,
    },
    "defence_dual_use": {
        "hypersonics_defence": 0.6,
        "navigation_pnt_systems": 0.45,
        "aerospace_materials": 0.4,
    },
    "hypersonics_defence": {
        "defence_dual_use": 0.6,
        "aerospace_materials": 0.5,
    },
    "electric_aviation": {
        "aviation_compliance_operations": 0.55,
        "aerospace_materials": 0.45,
    },
    "navigation_pnt_systems": {
        "satellite_space_systems": 0.55,
        "defence_dual_use": 0.45,
    },
    # Fintech
    "payments_settlement": {
        "embedded_finance": 0.6,
        "consumer_finance_banking": 0.5,
        "digital_assets_web3": 0.4,
        "retail_investing_platforms": 0.35,
    },
    "lending_credit_risk": {
        "working_capital_finance": 0.65,
        "consumer_finance_banking": 0.55,
        "embedded_finance": 0.5,
        "home_loans_mortgages": 0.45,
    },
    "wealth_asset_management": {
        "financial_advice_workflows": 0.65,
        "fund_admin_private_markets": 0.55,
        "retail_investing_platforms": 0.5,
        "personal_finance_tools": 0.45,
    },
    "capital_markets_trading_infrastructure": {
        "fund_admin_private_markets": 0.5,
        "digital_assets_web3": 0.45,
        "retail_investing_platforms": 0.4,
    },
    "capital_formation_crowdfunding": {
        "retail_investing_platforms": 0.55,
        "consumer_finance_banking": 0.4,
    },
    "insurance": {
        "embedded_finance": 0.45,
        "consumer_finance_banking": 0.4,
    },
    # Enterprise software
    "ai_compute_infrastructure": {
        "cloud_data_infrastructure": 0.75,
        "developer_tools_app_platforms": 0.55,
        "enterprise_data_platforms": 0.45,
        "ai_governance_security": 0.4,
        "quantum_timing_infrastructure": 0.35,
    },
    "cloud_data_infrastructure": {
        "ai_compute_infrastructure": 0.75,
        "enterprise_data_platforms": 0.65,
        "cloud_finops": 0.55,
        "data_privacy_security": 0.4,
        "digital_twin_infrastructure": 0.4,
    },
    "enterprise_data_platforms": {
        "cloud_data_infrastructure": 0.65,
        "productivity_collaboration": 0.45,
        "ai_compute_infrastructure": 0.45,
        "product_analytics_user_research": 0.4,
        "developer_tools_app_platforms": 0.4,
    },
    "developer_tools_app_platforms": {
        "ai_compute_infrastructure": 0.55,
        "enterprise_data_platforms": 0.4,
        "productivity_collaboration": 0.45,
        "content_design_tools": 0.35,
    },
    "vertical_business_operations": {
        "productivity_collaboration": 0.65,
        "retail_operations_order_management": 0.55,
        "legaltech_contract_workflows": 0.45,
        "compliance_risk_workflows": 0.45,
        "customer_support_contact_center": 0.4,
        "sales_marketing_intelligence": 0.4,
        "proposal_tender_workflows": 0.4,
    },
    "productivity_collaboration": {
        "vertical_business_operations": 0.65,
        "enterprise_data_platforms": 0.45,
        "developer_tools_app_platforms": 0.45,
        "content_design_tools": 0.45,
    },
    "data_privacy_security": {
        "ai_governance_security": 0.7,
        "compliance_risk_workflows": 0.6,
        "cloud_data_infrastructure": 0.4,
    },
    "ai_governance_security": {
        "data_privacy_security": 0.7,
        "compliance_risk_workflows": 0.55,
    },
    "sales_marketing_intelligence": {
        "product_analytics_user_research": 0.6,
        "vertical_business_operations": 0.4,
        "digital_advertising_marketing": 0.45,
    },
    "legaltech_contract_workflows": {
        "compliance_risk_workflows": 0.6,
        "proposal_tender_workflows": 0.45,
        "vertical_business_operations": 0.4,
    },
    "customer_support_contact_center": {
        "vertical_business_operations": 0.4,
        "product_analytics_user_research": 0.35,
    },
    "geospatial_mapping_mlops": {
        "digital_twin_infrastructure": 0.55,
        "autonomous_mapping": 0.45,
    },
    "automotive_data_intelligence": {
        "retail_operations_order_management": 0.35,
        "digital_twin_infrastructure": 0.4,
    },
    "semiconductor_packaging": {
        "quantum_timing_infrastructure": 0.35,
        "ai_compute_infrastructure": 0.3,
    },
    # Education
    "education_training_platforms": {
        "career_skills_verification": 0.7,
    },
    "career_skills_verification": {
        "education_training_platforms": 0.7,
    },
    # Industrial robotics
    "autonomous_navigation_systems": {
        "autonomous_mapping": 0.75,
        "industrial_robotics": 0.55,
        "computer_vision_inspection": 0.5,
    },
    "autonomous_mapping": {
        "autonomous_navigation_systems": 0.75,
        "computer_vision_inspection": 0.5,
        "geospatial_mapping_mlops": 0.45,
    },
    "industrial_robotics": {
        "autonomous_navigation_systems": 0.55,
        "manufacturing_equipment": 0.6,
        "industrial_automation_procurement": 0.55,
        "computer_vision_inspection": 0.5,
        "hazardous_environment_operations": 0.4,
    },
    "manufacturing_equipment": {
        "industrial_robotics": 0.6,
        "industrial_automation_procurement": 0.55,
        "asset_maintenance_fleet_management": 0.45,
    },
    "asset_maintenance_fleet_management": {
        "manufacturing_equipment": 0.45,
        "automotive_parts_intelligence": 0.4,
        "industrial_automation_procurement": 0.4,
    },
    "waste_sorting_automation": {
        "computer_vision_inspection": 0.5,
        "industrial_robotics": 0.45,
        "circular_waste_recycling": 0.4,
    },
    # Food / ag
    "agtech_farm_management": {
        "sustainable_agriculture": 0.65,
        "livestock_management": 0.5,
        "agriculture_supply_chain_traceability": 0.55,
        "food_processing_manufacturing": 0.35,
    },
    "sustainable_agriculture": {
        "agtech_farm_management": 0.65,
        "alternative_protein_ingredients": 0.4,
        "agriculture_supply_chain_traceability": 0.45,
    },
    "alternative_protein_ingredients": {
        "industrial_biotechnology": 0.6,
        "food_processing_manufacturing": 0.5,
    },
    "aquaculture_seafood": {
        "livestock_management": 0.4,
        "agriculture_supply_chain_traceability": 0.4,
    },
    "dairy_nutrition": {
        "food_processing_manufacturing": 0.5,
        "wine_beverage": 0.35,
    },
    # Transport / logistics
    "logistics_supply_chain": {
        "road_freight_mobility": 0.6,
        "maritime_transport": 0.45,
        "airport_operations": 0.4,
        "infrastructure_operations_connectivity": 0.45,
    },
    "road_freight_mobility": {
        "logistics_supply_chain": 0.6,
        "transport_energy_fuel": 0.45,
    },
    "airport_operations": {
        "logistics_supply_chain": 0.4,
        "infrastructure_operations_connectivity": 0.45,
        "aviation_compliance_operations": 0.4,
    },
    "maritime_transport": {
        "logistics_supply_chain": 0.45,
        "transport_energy_fuel": 0.4,
    },
    # Property / construction
    "real_estate_construction_workflows": {
        "property_transaction_workflows": 0.55,
        "construction_payments_finance": 0.5,
        "building_materials": 0.4,
        "prefabricated_sustainable_buildings": 0.45,
    },
    "property_transaction_workflows": {
        "real_estate_construction_workflows": 0.55,
        "construction_payments_finance": 0.4,
    },
    "building_materials": {
        "prefabricated_sustainable_buildings": 0.6,
        "real_estate_construction_workflows": 0.4,
    },
    # Consumer / marketplace
    "marketplace_commerce": {
        "consumer_products": 0.55,
        "grocery_meal_planning": 0.4,
        "digital_advertising_marketing": 0.45,
        "consumer_rewards_loyalty": 0.45,
    },
    "digital_advertising_marketing": {
        "creator_content_tools": 0.5,
        "sales_marketing_intelligence": 0.45,
        "marketplace_commerce": 0.45,
    },
    "consumer_products": {
        "pet_care_nutrition": 0.4,
        "marketplace_commerce": 0.55,
        "hospitality_entertainment": 0.35,
    },
    "immersive_ar_experiences": {
        "creator_content_tools": 0.5,
        "hospitality_entertainment": 0.4,
    },
    "consumer_identity_trust": {
        "consumer_rewards_loyalty": 0.45,
        "marketplace_commerce": 0.35,
    },
}

# Themes with very few investor preferences should not drive hard mismatch zeros.
SPARSE_THEME_PREF_THRESHOLD = 3

CUSTOMER_TYPE_ALIASES: dict[str, str] = {
    "b2b": "enterprise",
    "business": "enterprise",
    "businesses": "enterprise",
    "b2b_enterprise": "enterprise",
    "enterprise_b2b": "enterprise",
    "b2c": "consumer",
    "consumers": "consumer",
    "b2b2c": "consumer",
    "sme": "smb",
    "smes": "smb",
    "small_business": "smb",
    "small_businesses": "smb",
    "mid_market": "smb",
    "hospital": "healthcare_provider",
    "hospitals": "healthcare_provider",
    "clinic": "healthcare_provider",
    "clinics": "healthcare_provider",
    "provider": "healthcare_provider",
    "gov": "government",
    "public_sector": "government",
}


def normalize_customer_type_code(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    if not normalized:
        return None
    return CUSTOMER_TYPE_ALIASES.get(normalized, normalized)


def themes_for_sectors(sectors: list[str]) -> list[str]:
    seen: list[str] = []
    for sector in sectors:
        for theme in SECTOR_THEMES.get(sector, ()):
            if theme not in seen:
                seen.append(theme)
    return seen


def related_theme_strength(left: str, right: str) -> float:
    if left == right:
        return 1.0
    forward = THEME_RELATIONS.get(left, {}).get(right)
    if forward is not None:
        return forward
    reverse = THEME_RELATIONS.get(right, {}).get(left)
    if reverse is not None:
        return reverse * 0.9
    return 0.0


def best_related_theme_match(
    founder_themes: list[str],
    investor_themes: list[str],
) -> tuple[float, str | None, str | None]:
    best = 0.0
    best_pair: tuple[str | None, str | None] = (None, None)
    for founder_theme in founder_themes:
        for investor_theme in investor_themes:
            strength = related_theme_strength(founder_theme, investor_theme)
            if strength > best:
                best = strength
                best_pair = (founder_theme, investor_theme)
    return best, best_pair[0], best_pair[1]


def format_taxonomy_for_prompt(*, sectors: list[str] | None = None) -> str:
    selected = sectors or list(SECTOR_THEMES.keys())
    blocks: list[str] = []
    for sector in selected:
        themes = SECTOR_THEMES.get(sector)
        if not themes:
            continue
        theme_lines = "\n".join(f"  - {theme}" for theme in themes)
        blocks.append(f"{sector}:\n{theme_lines}")
    return "\n".join(blocks)

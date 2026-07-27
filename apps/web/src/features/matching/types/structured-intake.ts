export type IntakeOption = {
  value: string;
  label: string;
};

export const STAGE_OPTIONS: IntakeOption[] = [
  { value: "pre_seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
];

export const HQ_COUNTRY_OPTIONS: IntakeOption[] = [
  { value: "AU", label: "Australia" },
  { value: "NZ", label: "New Zealand" },
  { value: "US", label: "United States" },
  { value: "SG", label: "Singapore" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "other", label: "Other" },
];

export const PRIMARY_MARKET_OPTIONS: IntakeOption[] = [
  { value: "Australia", label: "Australia" },
  { value: "New Zealand", label: "New Zealand" },
  { value: "ANZ", label: "Australia and New Zealand" },
  { value: "Southeast Asia", label: "Southeast Asia" },
  { value: "North America", label: "North America" },
  { value: "Europe", label: "Europe" },
  { value: "Global", label: "Global" },
  { value: "other", label: "Other" },
];

export const CURRENCY_OPTIONS: IntakeOption[] = [
  { value: "AUD", label: "AUD" },
  { value: "NZD", label: "NZD" },
  { value: "USD", label: "USD" },
];

export const RAISE_UNIT_OPTIONS: IntakeOption[] = [
  { value: "thousand", label: "Thousand" },
  { value: "million", label: "Million" },
];

export const LEAD_NEED_OPTIONS: IntakeOption[] = [
  { value: "true", label: "Yes, we need a lead" },
  { value: "false", label: "No, the lead is covered" },
];

export const CUSTOMER_TYPE_OPTIONS: IntakeOption[] = [
  { value: "consumer", label: "Consumer" },
  { value: "smb", label: "Small business (SMB)" },
  { value: "mid_market", label: "Mid-market" },
  { value: "enterprise", label: "Enterprise" },
  { value: "developer", label: "Developers" },
  { value: "healthcare_provider", label: "Healthcare providers" },
  { value: "government", label: "Government" },
  { value: "education_institution", label: "Education institutions" },
  { value: "other", label: "Other" },
];

export const BUSINESS_MODEL_OPTIONS: IntakeOption[] = [
  { value: "subscription_saas", label: "Subscription SaaS" },
  { value: "usage_based", label: "Usage-based" },
  { value: "transaction_fee", label: "Transaction fees" },
  { value: "marketplace_take_rate", label: "Marketplace take rate" },
  { value: "licensing", label: "Licensing" },
  { value: "hardware_sales", label: "Hardware sales" },
  { value: "services", label: "Services" },
  { value: "advertising", label: "Advertising" },
  { value: "freemium", label: "Freemium" },
  { value: "commerce", label: "Commerce" },
  { value: "other", label: "Other" },
];

export const SALES_MOTION_OPTIONS: IntakeOption[] = [
  { value: "plg", label: "Product-led growth" },
  { value: "sales_led", label: "Sales-led" },
  { value: "channel_partner", label: "Channel partners" },
  { value: "community_led", label: "Community-led" },
  { value: "enterprise_top_down", label: "Enterprise top-down" },
  { value: "self_serve", label: "Self-serve" },
  { value: "other", label: "Other" },
];

export const TECHNOLOGY_DEPTH_OPTIONS: IntakeOption[] = [
  { value: "conventional_software", label: "Conventional software" },
  { value: "applied_ai", label: "Applied AI" },
  { value: "ai_infrastructure", label: "AI infrastructure" },
  { value: "deep_tech_research", label: "Deep tech / research" },
  { value: "hardware_engineering", label: "Hardware engineering" },
  { value: "other", label: "Other" },
];

export const AI_RELEVANCE_OPTIONS: IntakeOption[] = [
  { value: "none", label: "Not AI-dependent" },
  { value: "ai_enabled", label: "AI-enabled" },
  { value: "ai_native", label: "AI-native" },
  { value: "ai_infrastructure", label: "AI infrastructure" },
];

export const SECTOR_OPTIONS: IntakeOption[] = [
  { value: "healthcare_life_sciences", label: "Healthcare / Life Sciences" },
  { value: "resources_mining_metals", label: "Mining / Resources / Metals" },
  { value: "energy_climate", label: "Energy / Climate" },
  { value: "aerospace_space_defence", label: "Aerospace / Space / Defence" },
  { value: "fintech_financial_services", label: "Fintech / Financial Services" },
  {
    value: "enterprise_software_data_security",
    label: "Enterprise Software / Data / Security",
  },
  { value: "education_workforce", label: "Education / Workforce" },
  {
    value: "industrial_robotics_automation",
    label: "Industrial Robotics / Automation",
  },
  { value: "food_agriculture", label: "Food / Agriculture" },
  {
    value: "transport_logistics_infrastructure",
    label: "Transport / Logistics / Infrastructure",
  },
  { value: "property_construction", label: "Property / Construction" },
  { value: "consumer_marketplace", label: "Consumer / Marketplace" },
];

function directionOptions(values: string[]): IntakeOption[] {
  return values.map((value) => ({
    value,
    label: value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  }));
}

export const DIRECTION_OPTIONS_BY_SECTOR: Record<string, IntakeOption[]> = {
  healthcare_life_sciences: directionOptions([
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
  ]),
  resources_mining_metals: directionOptions([
    "critical_minerals",
    "rare_earths",
    "base_precious_metals",
    "bulk_commodities",
    "mineral_exploration_drilling",
    "mine_development_production",
    "mineral_processing",
    "gas_resources",
    "mining_workflow_software",
  ]),
  energy_climate: directionOptions([
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
  ]),
  aerospace_space_defence: directionOptions([
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
  ]),
  fintech_financial_services: directionOptions([
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
  ]),
  enterprise_software_data_security: directionOptions([
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
  ]),
  education_workforce: directionOptions([
    "education_training_platforms",
    "career_skills_verification",
  ]),
  industrial_robotics_automation: directionOptions([
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
  ]),
  food_agriculture: directionOptions([
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
  ]),
  transport_logistics_infrastructure: directionOptions([
    "airport_operations",
    "road_freight_mobility",
    "logistics_supply_chain",
    "maritime_transport",
    "transport_energy_fuel",
    "infrastructure_operations_connectivity",
  ]),
  property_construction: directionOptions([
    "property_transaction_workflows",
    "construction_payments_finance",
    "building_materials",
    "prefabricated_sustainable_buildings",
    "real_estate_construction_workflows",
  ]),
  consumer_marketplace: directionOptions([
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
  ]),
};

export type StructuredIntakeValues = {
  companyName: string;
  companySummary: string;
  hqCountry: string;
  otherHqCountry: string;
  primaryMarket: string;
  otherPrimaryMarket: string;
  stage: string;
  raiseAmount: string;
  raiseCurrency: string;
  raiseUnit: string;
  leadNeeded: string;
  sectors: string[];
  directions: string[];
  customerType: string;
  businessModel: string;
  salesMotion: string;
  technologyDepth: string;
  aiRelevance: string;
  tractionSummary: string;
  additionalContext: string;
};

export const EMPTY_STRUCTURED_INTAKE: StructuredIntakeValues = {
  companyName: "",
  companySummary: "",
  hqCountry: "",
  otherHqCountry: "",
  primaryMarket: "",
  otherPrimaryMarket: "",
  stage: "",
  raiseAmount: "",
  raiseCurrency: "AUD",
  raiseUnit: "million",
  leadNeeded: "",
  sectors: [],
  directions: [],
  customerType: "",
  businessModel: "",
  salesMotion: "",
  technologyDepth: "",
  aiRelevance: "",
  tractionSummary: "",
  additionalContext: "",
};

function optionLabel(options: IntakeOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function selectedLabels(options: IntakeOption[], values: string[]): string {
  return values.map((value) => optionLabel(options, value)).join(", ");
}

export function getDirectionOptions(sectors: string[]): IntakeOption[] {
  return sectors.flatMap((sector) => DIRECTION_OPTIONS_BY_SECTOR[sector] ?? []);
}

export function isStructuredIntakeComplete(values: StructuredIntakeValues): boolean {
  return Boolean(
    values.companyName.trim() &&
    values.companySummary.trim() &&
    values.hqCountry &&
    (values.hqCountry !== "other" || values.otherHqCountry.trim()) &&
    values.primaryMarket &&
    (values.primaryMarket !== "other" || values.otherPrimaryMarket.trim()) &&
    values.stage &&
    values.raiseAmount &&
    values.raiseCurrency &&
    values.raiseUnit &&
    values.leadNeeded &&
    values.sectors.length > 0 &&
    values.customerType &&
    values.businessModel,
  );
}

export function buildStructuredIntakeMessage(values: StructuredIntakeValues): string {
  const hqCountry =
    values.hqCountry === "other"
      ? values.otherHqCountry.trim()
      : optionLabel(HQ_COUNTRY_OPTIONS, values.hqCountry);
  const primaryMarket =
    values.primaryMarket === "other"
      ? values.otherPrimaryMarket.trim()
      : optionLabel(PRIMARY_MARKET_OPTIONS, values.primaryMarket);
  const directionOptions = getDirectionOptions(values.sectors);
  const leadNeeded = values.leadNeeded === "true" ? "Yes" : "No";

  const lines = [
    `Company name: ${values.companyName.trim()}`,
    `Company HQ country: ${hqCountry}`,
    `Primary market: ${primaryMarket}`,
    `Fundraising stage: ${optionLabel(STAGE_OPTIONS, values.stage)} (${values.stage})`,
    `Target raise: ${values.raiseCurrency} ${values.raiseAmount} ${values.raiseUnit}`,
    `Lead investor needed: ${leadNeeded}`,
    `Sector: ${selectedLabels(SECTOR_OPTIONS, values.sectors)}`,
    `Actual sector codes: ${values.sectors.join(", ")}`,
    values.directions.length > 0
      ? `Specific directions: ${selectedLabels(directionOptions, values.directions)}`
      : "",
    values.directions.length > 0
      ? `Actual theme codes: ${values.directions.join(", ")}`
      : "",
    `Customer type: ${values.customerType}`,
    `Business model: ${values.businessModel}`,
    values.salesMotion ? `Sales motion: ${values.salesMotion}` : "",
    values.technologyDepth ? `Technology depth: ${values.technologyDepth}` : "",
    values.aiRelevance ? `AI relevance: ${values.aiRelevance}` : "",
    `One sentence summary: ${values.companySummary.trim()}`,
    values.tractionSummary.trim()
      ? `Traction summary: ${values.tractionSummary.trim()}`
      : "",
    values.additionalContext.trim()
      ? `Ideal investor or additional context: ${values.additionalContext.trim()}`
      : "",
  ];

  return lines.filter(Boolean).join("\n");
}

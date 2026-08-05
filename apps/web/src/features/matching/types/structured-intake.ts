import { z } from "zod";

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
  { value: "subscription_saas", label: "Subscription software (SaaS)" },
  { value: "usage_based", label: "Pay based on usage" },
  { value: "transaction_fee", label: "Fee per transaction" },
  { value: "marketplace_take_rate", label: "Marketplace commission" },
  { value: "licensing", label: "Software or IP licensing" },
  { value: "hardware_sales", label: "Hardware or product sales" },
  { value: "services", label: "Professional or managed services" },
  { value: "advertising", label: "Advertising revenue" },
  { value: "freemium", label: "Free tier with paid upgrades" },
  { value: "commerce", label: "Direct commerce" },
  { value: "other", label: "Other" },
];

export const SALES_MOTION_OPTIONS: IntakeOption[] = [
  { value: "plg", label: "Product-led - users can start on their own" },
  { value: "sales_led", label: "Sales-led - a sales team drives adoption" },
  { value: "channel_partner", label: "Partner or channel-led" },
  { value: "community_led", label: "Community-led" },
  { value: "enterprise_top_down", label: "Enterprise top-down sales" },
  { value: "self_serve", label: "Self-serve purchase" },
  { value: "other", label: "Other" },
];

export const TECHNOLOGY_DEPTH_OPTIONS: IntakeOption[] = [
  {
    value: "conventional_software",
    label: "Standard software - no core AI or hard-tech dependency",
  },
  {
    value: "applied_ai",
    label: "AI-powered application - AI is applied to a customer problem",
  },
  {
    value: "ai_infrastructure",
    label: "AI infrastructure - tools or infrastructure for AI systems",
  },
  {
    value: "deep_tech_research",
    label: "Deep tech - research or defensible scientific IP",
  },
  {
    value: "hardware_engineering",
    label: "Hardware or engineering-led product",
  },
  { value: "other", label: "Other" },
];

export const AI_RELEVANCE_OPTIONS: IntakeOption[] = [
  { value: "none", label: "No meaningful AI component" },
  { value: "ai_enabled", label: "AI-enabled - AI improves selected features" },
  { value: "ai_native", label: "AI-native - the product depends on AI" },
  {
    value: "ai_infrastructure",
    label: "AI infrastructure - the product enables other AI systems",
  },
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

const DIRECTION_TOKEN_LABELS: Record<string, string> = {
  ai: "AI",
  ar: "AR",
  ev: "EV",
  finops: "FinOps",
  mlops: "MLOps",
  pnt: "PNT",
  web3: "Web3",
  womens: "Women's",
};

function directionOptions(values: string[]): IntakeOption[] {
  return values.map((value) => ({
    value,
    label: value
      .split("_")
      .map((part, index) => {
        const fixedLabel = DIRECTION_TOKEN_LABELS[part];
        if (fixedLabel) {
          return fixedLabel;
        }
        return index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part;
      })
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

export const structuredIntakeValuesSchema = z.object({
  companyName: z.string(),
  companySummary: z.string(),
  hqCountry: z.string(),
  otherHqCountry: z.string(),
  primaryMarket: z.string(),
  otherPrimaryMarket: z.string(),
  stage: z.string(),
  raiseAmount: z.string(),
  raiseCurrency: z.string(),
  leadNeeded: z.string(),
  sectors: z.array(z.string()),
  directions: z.array(z.string()),
  customerType: z.string(),
  businessModel: z.string(),
  salesMotion: z.string(),
  technologyDepth: z.string(),
  aiRelevance: z.string(),
});

export type StructuredIntakeValues = z.infer<typeof structuredIntakeValuesSchema>;

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
  leadNeeded: "",
  sectors: [],
  directions: [],
  customerType: "",
  businessModel: "",
  salesMotion: "",
  technologyDepth: "",
  aiRelevance: "",
};

export function getIntakeOptionLabel(options: IntakeOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function selectedLabels(options: IntakeOption[], values: string[]): string {
  return values.map((value) => getIntakeOptionLabel(options, value)).join(", ");
}

export function getDirectionOptions(sectors: string[]): IntakeOption[] {
  return sectors.flatMap((sector) => DIRECTION_OPTIONS_BY_SECTOR[sector] ?? []);
}

export function isStructuredIntakeComplete(values: StructuredIntakeValues): boolean {
  return isCompanyAndRaiseComplete(values) && isMatchingSignalsComplete(values);
}

export function isCompanyAndRaiseComplete(values: StructuredIntakeValues): boolean {
  return Boolean(
    values.companyName.trim() &&
    values.hqCountry &&
    (values.hqCountry !== "other" || values.otherHqCountry.trim()) &&
    values.primaryMarket &&
    (values.primaryMarket !== "other" || values.otherPrimaryMarket.trim()) &&
    values.stage &&
    Number(values.raiseAmount) > 0 &&
    values.raiseCurrency &&
    values.leadNeeded,
  );
}

export function isMatchingSignalsComplete(values: StructuredIntakeValues): boolean {
  return Boolean(
    values.sectors.length > 0 && values.customerType && values.businessModel,
  );
}

export function buildStructuredIntakeMessage(values: StructuredIntakeValues): string {
  const hqCountry =
    values.hqCountry === "other"
      ? values.otherHqCountry.trim()
      : getIntakeOptionLabel(HQ_COUNTRY_OPTIONS, values.hqCountry);
  const primaryMarket =
    values.primaryMarket === "other"
      ? values.otherPrimaryMarket.trim()
      : getIntakeOptionLabel(PRIMARY_MARKET_OPTIONS, values.primaryMarket);
  const directionOptions = getDirectionOptions(values.sectors);
  const leadNeeded = values.leadNeeded === "true" ? "Yes" : "No";

  const lines = [
    `Company name: ${values.companyName.trim()}`,
    `Company HQ country: ${hqCountry}`,
    `Primary market: ${primaryMarket}`,
    `Fundraising stage: ${getIntakeOptionLabel(STAGE_OPTIONS, values.stage)} (${values.stage})`,
    `Target raise: ${values.raiseCurrency} ${values.raiseAmount} in whole currency units`,
    `Target raise value: ${values.raiseAmount}`,
    `Target raise unit: absolute`,
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
    values.companySummary.trim()
      ? `Additional company context: ${values.companySummary.trim()}`
      : "",
  ];

  return lines.filter(Boolean).join("\n");
}

function normalizedOptionValue(options: IntakeOption[], value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }
  const normalized = value.trim().toLowerCase().replaceAll("-", "_");
  return (
    options.find(
      (option) =>
        option.value.toLowerCase().replaceAll("-", "_") === normalized ||
        option.label.toLowerCase().replaceAll("-", "_") === normalized,
    )?.value ?? ""
  );
}

function profileString(profile: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function profileStrings(profile: Record<string, unknown>, ...keys: string[]): string[] {
  const values = new Set<string>();
  for (const key of keys) {
    const value = profile[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          values.add(item.trim());
        }
      }
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      values.add(value.trim());
    }
  }
  return [...values];
}

function knownOptionValues(options: IntakeOption[], values: string[]): string[] {
  return [
    ...new Set(
      values.map((value) => normalizedOptionValue(options, value)).filter(Boolean),
    ),
  ];
}

function otherOptionSelection(options: IntakeOption[], rawValue: string) {
  const knownValue = normalizedOptionValue(options, rawValue);
  if (knownValue) {
    return { value: knownValue, otherValue: "" };
  }
  if (rawValue) {
    return { value: "other", otherValue: rawValue };
  }
  return { value: "", otherValue: "" };
}

function wholeRaiseAmount(profile: Record<string, unknown>): string {
  const rawValue = profileString(profile, "target_raise_value");
  const amount = Number(rawValue);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }
  const unit = profileString(profile, "target_raise_unit").toLowerCase();
  const multiplier =
    unit === "million" || unit === "m"
      ? 1_000_000
      : unit === "thousand" || unit === "k"
        ? 1_000
        : 1;
  return String(Math.round(amount * multiplier));
}

function leadNeededValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "required", "needed"].includes(normalized)) {
    return "true";
  }
  if (["false", "no", "covered", "not needed"].includes(normalized)) {
    return "false";
  }
  return "";
}

/**
 * Restores older history records that predate exact structured-intake snapshots.
 * New records use their saved form values; this is a best-effort compatibility path.
 */
export function structuredIntakeFromParsedProfile(
  profile: Record<string, unknown>,
): StructuredIntakeValues {
  const hq = otherOptionSelection(
    HQ_COUNTRY_OPTIONS,
    profileString(profile, "company_hq_country"),
  );
  const market = otherOptionSelection(
    PRIMARY_MARKET_OPTIONS,
    profileString(profile, "primary_market"),
  );
  const sectors = knownOptionValues(
    SECTOR_OPTIONS,
    profileStrings(profile, "actual_sector", "sector"),
  );
  const directionOptions = getDirectionOptions(sectors);
  const directions = knownOptionValues(
    directionOptions,
    profileStrings(profile, "actual_themes", "primary_themes", "secondary_themes"),
  );

  return {
    companyName: profileString(profile, "company_name"),
    companySummary: profileString(profile, "one_sentence_summary", "traction_summary"),
    hqCountry: hq.value,
    otherHqCountry: hq.otherValue,
    primaryMarket: market.value,
    otherPrimaryMarket: market.otherValue,
    stage: normalizedOptionValue(STAGE_OPTIONS, profileString(profile, "stage")),
    raiseAmount: wholeRaiseAmount(profile),
    raiseCurrency: normalizedOptionValue(
      CURRENCY_OPTIONS,
      profileString(profile, "target_raise_currency"),
    ),
    leadNeeded: leadNeededValue(profile.lead_needed),
    sectors,
    directions,
    customerType: normalizedOptionValue(
      CUSTOMER_TYPE_OPTIONS,
      profileString(profile, "customer_type"),
    ),
    businessModel: normalizedOptionValue(
      BUSINESS_MODEL_OPTIONS,
      profileString(profile, "business_model"),
    ),
    salesMotion: normalizedOptionValue(
      SALES_MOTION_OPTIONS,
      profileString(profile, "sales_motion"),
    ),
    technologyDepth: normalizedOptionValue(
      TECHNOLOGY_DEPTH_OPTIONS,
      profileString(profile, "technology_depth"),
    ),
    aiRelevance: normalizedOptionValue(
      AI_RELEVANCE_OPTIONS,
      profileString(profile, "ai_relevance"),
    ),
  };
}

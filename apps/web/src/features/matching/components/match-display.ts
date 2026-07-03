import type { MatchResult } from "@/features/matching/types/match";

export const PROFILE_FIELDS = [
  { key: "company_name", label: "Company" },
  { key: "company_hq_country", label: "HQ" },
  { key: "primary_market", label: "Market" },
  { key: "stage", label: "Stage" },
  { key: "sector", label: "Sector" },
  { key: "business_model", label: "Model" },
  { key: "target_raise_value", label: "Raise" },
  { key: "target_raise_currency", label: "Currency" },
  { key: "target_raise_unit", label: "Unit" },
  { key: "lead_needed", label: "Lead" },
];

const MATCH_FACTOR_ORDER = [
  "geography_anz_mandate",
  "stage_first_cheque_fit",
  "sector_use_case_fit",
  "recent_deal_similarity",
  "business_model_icp_fit",
  "cheque_round_size_fit",
  "lead_behavior_fit",
  "investor_activity_recency",
  "ai_thesis_appetite",
  "founder_traction_fit",
];

const MATCH_FACTOR_LABELS: Record<string, string> = {
  geography_anz_mandate: "Geography",
  stage_first_cheque_fit: "Stage",
  sector_use_case_fit: "Sector",
  recent_deal_similarity: "Deals",
  business_model_icp_fit: "Model",
  cheque_round_size_fit: "Cheque",
  lead_behavior_fit: "Lead",
  investor_activity_recency: "Activity",
  ai_thesis_appetite: "AI thesis",
  founder_traction_fit: "Founder",
};

export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Missing";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function labelFromKey(value: string): string {
  return MATCH_FACTOR_LABELS[value] ?? value.replaceAll("_", " ");
}

export function orderedBreakdownEntries(breakdown: MatchResult["breakdown"]) {
  const known = MATCH_FACTOR_ORDER.filter((key) => key in breakdown).map(
    (key) => [key, breakdown[key]] as const,
  );
  const extra = Object.entries(breakdown).filter(
    ([key]) => !MATCH_FACTOR_ORDER.includes(key),
  );
  return [...known, ...extra];
}

export function formatRecordDate(value: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

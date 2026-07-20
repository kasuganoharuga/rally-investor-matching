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
  "stage_evidence_depth",
  "geography_fit",
  "sector_fit",
  "theme_fit",
  "recent_deal_similarity",
  "customer_icp_fit",
  "cheque_size_fit",
  "lead_behavior_fit",
  "data_quality_recency",
];

const MATCH_FACTOR_LABELS: Record<string, string> = {
  stage_evidence_depth: "Stage evidence",
  geography_fit: "Geography",
  sector_fit: "Sector",
  theme_fit: "Theme",
  recent_deal_similarity: "Deal evidence",
  customer_icp_fit: "Customer",
  cheque_size_fit: "Cheque",
  lead_behavior_fit: "Lead",
  data_quality_recency: "Recency",
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

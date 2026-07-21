import type {
  MatchInvestorProfile,
  MatchRecentDeal,
  MatchStagePreference,
} from "@/features/matching/types/match";

const ACRONYMS: Record<string, string> = {
  ai: "AI",
  anz: "ANZ",
  au: "AU",
  b2b: "B2B",
  b2c: "B2C",
  crm: "CRM",
  hq: "HQ",
  icp: "ICP",
  nz: "NZ",
  saas: "SaaS",
  smb: "SMB",
  uk: "UK",
  us: "US",
  usd: "USD",
  vc: "VC",
};

export type WeightedSignal = {
  label: string;
  value: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function labelFromCode(value: string | null | undefined): string {
  if (!value) {
    return "Not listed";
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(
      (item) =>
        ACRONYMS[item.toLowerCase()] ??
        `${item.charAt(0).toUpperCase()}${item.slice(1)}`,
    )
    .join(" ");
}

export function humanizeEvidenceText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/\b[a-z0-9]+(?:_[a-z0-9]+)+\b/gi, (code) => code.replaceAll("_", " "))
    .replace(
      /(\d+)\s+core-stage deal\(s\) used for preferences:/gi,
      (_, count: string) =>
        `Based on ${count} relevant ${count === "1" ? "deal" : "deals"}:`,
    )
    .replace(
      /(\d+)\s+([a-z0-9 ]+?)\s+evidence deal\(s\)/gi,
      (_, count: string, stage: string) =>
        `Based on ${count} ${stage.trim()} ${count === "1" ? "deal" : "deals"}`,
    )
    .replace(
      /(\d+)\s+lead\/co-lead/gi,
      (_, count: string) =>
        `${count} led or co-led ${count === "1" ? "deal" : "deals"}`,
    )
    .replace(/Promoted sectors:/gi, "Observed sectors:")
    .replace(/Promoted themes:/gi, "Specific investment themes:");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function websiteHost(url: string | null | undefined): string {
  if (!url) {
    return "Website not listed";
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function locationLabel(profile: MatchInvestorProfile | undefined): string {
  const parts = [profile?.hq_city, profile?.hq_state, profile?.hq_country]
    .filter(Boolean)
    .map((item) => labelFromCode(String(item)));
  return parts.length > 0 ? parts.join(", ") : "Location not listed";
}

export function uniqueValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function formatDate(
  value: string | null | undefined,
  includeDay = false,
): string {
  if (!value) {
    return "Date unknown";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-AU", {
    day: includeDay ? "numeric" : undefined,
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function currencyPrefix(currency: string | null | undefined): string {
  const normalized = currency?.toUpperCase();
  if (normalized === "AUD") return "A$";
  if (normalized === "NZD") return "NZ$";
  if (normalized === "USD") return "US$";
  return normalized ? `${normalized} ` : "US$";
}

export function formatMoney(
  value: number | null | undefined,
  currency: string | null | undefined = "USD",
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not disclosed";
  }
  const amount =
    value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}m`
      : value >= 1_000
        ? `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}k`
        : value.toLocaleString("en-AU");
  return `${currencyPrefix(currency)}${amount}`;
}

export function formatChequeRange(preference: MatchStagePreference): string {
  const min = toNumber(preference.cheque_size_min_usd);
  const max = toNumber(preference.cheque_size_max_usd);
  if (min !== null && max !== null) {
    return min === max ? formatMoney(min) : `${formatMoney(min)} - ${formatMoney(max)}`;
  }
  if (min !== null) return `${formatMoney(min)}+`;
  if (max !== null) return `Up to ${formatMoney(max)}`;
  return "No observed range";
}

export function dealAmount(deal: MatchRecentDeal): string {
  const value = toNumber(deal.amount_value);
  if (value !== null) {
    return formatMoney(value, deal.amount_currency);
  }
  return deal.amount_text ?? deal.amount ?? "Not disclosed";
}

export function weightedSignals(
  preferences: MatchStagePreference[],
  dimension: string,
  limit = 5,
): WeightedSignal[] {
  const totals = new Map<string, number>();

  for (const preference of preferences) {
    const dimensionData = preference.dimension_distributions[dimension];
    if (!isRecord(dimensionData) || !isRecord(dimensionData.weighted)) {
      continue;
    }
    const evidenceWeight = Math.max(toNumber(preference.deals_count) ?? 1, 1);
    for (const [key, rawValue] of Object.entries(dimensionData.weighted)) {
      const value = toNumber(rawValue);
      if (value !== null && value > 0) {
        totals.set(key, (totals.get(key) ?? 0) + value * evidenceWeight);
      }
    }
  }

  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return [];
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value: value / total }));
}

export function dealSecondaryUseCases(deal: MatchRecentDeal): string[] {
  return (deal.use_case_secondary ?? []).filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

import type {
  MatchInvestorProfile,
  MatchRecentDeal,
} from "@/features/matching/types/match";

export function titleCase(value: string | null | undefined): string {
  if (!value) {
    return "Not listed";
  }
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

export function compactList(values: string[] | undefined, limit = 3): string {
  const filtered = (values ?? []).filter(Boolean).map(titleCase);
  if (filtered.length === 0) {
    return "Not listed";
  }
  const shown = filtered.slice(0, limit);
  const extra = filtered.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} +${extra}` : shown.join(", ");
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

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function locationLabel(profile: MatchInvestorProfile | undefined): string {
  const parts = [profile?.hq_city, profile?.hq_state, profile?.hq_country]
    .filter(Boolean)
    .map((item) => titleCase(String(item)));
  return parts.length > 0 ? parts.join(", ") : "Location not listed";
}

export function amountText(deal: MatchRecentDeal): string {
  if (deal.amount_text) {
    return deal.amount_text;
  }
  if (typeof deal.amount_value === "number" && deal.amount_currency) {
    return `${deal.amount_currency} ${deal.amount_value.toLocaleString("en-AU")}`;
  }
  if (deal.amount) {
    return deal.amount;
  }
  return "Not disclosed";
}

export function formatDealDate(value: string | null | undefined): string {
  if (!value) {
    return "Year unknown";
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-AU", {
      month: "short",
      year: "numeric",
    }).format(parsed);
  }
  if (/^\d{4}/.test(value)) {
    return value.slice(0, 4);
  }
  return value;
}

export function typicalCheque(profile: MatchInvestorProfile | undefined): string {
  const ranges = profile?.cheque_ranges ?? [];
  const firstRange = ranges.find((range) => range && typeof range === "object");
  if (!firstRange) {
    return "Not disclosed";
  }
  const min = firstRange.amount_min;
  const max = firstRange.amount_max;
  const currency = typeof firstRange.currency === "string" ? firstRange.currency : "";
  const fmt = (value: unknown) =>
    typeof value === "number"
      ? `${currency}${value >= 1000000 ? `${value / 1000000}m` : `${value / 1000}k`}`
      : null;
  const minText = fmt(min);
  const maxText = fmt(max);
  if (minText && maxText) {
    return `${minText}-${maxText}`;
  }
  return minText ? `${minText}+` : maxText ? `Up to ${maxText}` : "Not disclosed";
}

export function factorTone(value: number, max: number): "strong" | "partial" | "weak" {
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.75) {
    return "strong";
  }
  if (ratio >= 0.45) {
    return "partial";
  }
  return "weak";
}

export function factorLabel(tone: "strong" | "partial" | "weak"): string {
  if (tone === "strong") {
    return "Strong";
  }
  if (tone === "partial") {
    return "Partial";
  }
  return "Weak";
}

export function leadDealCount(deals: MatchRecentDeal[]): number {
  return deals.filter((deal) => deal.role?.toLowerCase().includes("lead")).length;
}

export function evidenceSummary(deals: MatchRecentDeal[]): string {
  const examples = deals
    .slice(0, 3)
    .map((deal) =>
      [deal.company, deal.round, amountText(deal), formatDealDate(deal.date)]
        .filter(Boolean)
        .join(" · "),
    );
  if (examples.length === 0) {
    return "No comparable deal rows are attached to this profile yet.";
  }
  return examples.join("; ");
}

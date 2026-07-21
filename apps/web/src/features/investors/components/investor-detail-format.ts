import type {
  InvestorDetail,
  InvestorRecentDeal,
} from "@/features/investors/types/investor";

const MONTHS_TRACKED_WINDOW = 24;

export function titleCase(value: string | null | undefined): string {
  if (!value) {
    return "Not specified";
  }
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function initials(name: string): string {
  const parts = name
    .replace(/\([^)]*\)/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const INVESTOR_TYPE_LABELS: Record<string, string> = {
  vc: "VC fund",
  vc_fund: "VC fund",
  angel_group: "Angel group",
  syndicate: "Syndicate",
  syndicate_platform: "Syndicate platform",
  government: "Government",
  debt_provider: "Debt provider",
  accelerator: "Accelerator / VC",
};

export function investorTypeLabel(value: string | null | undefined): string {
  return INVESTOR_TYPE_LABELS[value ?? ""] ?? titleCase(value);
}

export function locationLabel(investor: InvestorDetail): string {
  const parts = [investor.hqCity, investor.hqState, investor.hqCountry]
    .filter(Boolean)
    .map((value) => titleCase(String(value)));
  return parts.length > 0 ? parts.join(", ") : "Location pending";
}

export function leadsRounds(investor: InvestorDetail): boolean {
  const value = investor.leadBehavior?.toLowerCase() ?? "";
  return value.includes("lead") || value.includes("co_lead");
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

export function tagList(values: string[]): string[] {
  return values.filter(Boolean).map(titleCase);
}

export function compactAmount(value: unknown, currency: string): string | null {
  if (typeof value !== "number") {
    return null;
  }
  const prefix =
    currency === "AUD" ? "A$" : currency === "USD" ? "US$" : `${currency} `;
  if (value >= 1_000_000) {
    return `${prefix}${Number((value / 1_000_000).toFixed(1))}m`;
  }
  if (value >= 1_000) {
    return `${prefix}${Number((value / 1_000).toFixed(0))}k`;
  }
  return `${prefix}${value.toLocaleString("en-AU")}`;
}

export function chequeRangeLabel(range: Record<string, unknown>): string {
  const currency = String(range.currency ?? "AUD").toUpperCase();
  const min = compactAmount(range.amount_min, currency);
  const max = compactAmount(range.amount_max, currency);
  if (min && max) {
    return `${min}-${max.replace(/^(A\$|US\$)/, "")}`;
  }
  if (min) {
    return `${min}+`;
  }
  if (max) {
    return `\u2264${max}`;
  }
  return "Range pending";
}

export function amountText(deal: InvestorRecentDeal): string {
  if (deal.amount_text) {
    return deal.amount_text;
  }
  if (typeof deal.amount_value === "number" && deal.amount_currency) {
    return `${deal.amount_currency} ${deal.amount_value.toLocaleString("en-AU")}`;
  }
  if (deal.amount) {
    return deal.amount;
  }
  return "Amount unknown";
}

export function dealYear(deal: InvestorRecentDeal): string {
  if (deal.date && /^\d{4}/.test(deal.date)) {
    return deal.date.slice(0, 4);
  }
  return "Year unknown";
}

export function formatDealDate(deal: InvestorRecentDeal): string {
  if (deal.date && /^\d{4}-\d{2}-\d{2}$/.test(deal.date)) {
    const parsed = new Date(`${deal.date}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("en-AU", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(parsed);
    }
  }
  return dealYear(deal);
}

export function sortDealsByDateDesc(deals: InvestorRecentDeal[]): InvestorRecentDeal[] {
  return [...deals].sort((a, b) => {
    const aTime = a.date ? new Date(`${a.date}T00:00:00Z`).getTime() : NaN;
    const bTime = b.date ? new Date(`${b.date}T00:00:00Z`).getTime() : NaN;
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
      return 0;
    }
    if (Number.isNaN(aTime)) {
      return 1;
    }
    if (Number.isNaN(bTime)) {
      return -1;
    }
    return bTime - aTime;
  });
}

export function dealsTrackedSummary(
  deals: InvestorRecentDeal[],
  now: Date = new Date(),
): { total: number; last24Months: number } {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - MONTHS_TRACKED_WINDOW);

  let last24Months = 0;
  for (const deal of deals) {
    if (deal.date && /^\d{4}-\d{2}-\d{2}$/.test(deal.date)) {
      const parsed = new Date(`${deal.date}T00:00:00Z`);
      if (!Number.isNaN(parsed.getTime()) && parsed >= cutoff) {
        last24Months += 1;
      }
    }
  }
  return { total: deals.length, last24Months };
}

export type StatusTone = "positive" | "neutral";

export function statusBadgeLabel(status: string | null | undefined): {
  label: string;
  tone: StatusTone;
} {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "included") {
    return { label: "Included", tone: "positive" };
  }
  if (normalized === "watchlist") {
    return { label: "Watchlist", tone: "neutral" };
  }
  return { label: titleCase(status), tone: "neutral" };
}

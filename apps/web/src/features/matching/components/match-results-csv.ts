import type { MatchResult } from "@/features/matching/types/match";

const CSV_HEADERS = [
  "Matched Company",
  "Exported At",
  "Rank",
  "Investor ID",
  "Investor Name",
  "Score",
  "Match Tier",
  "Routing Pool",
  "Confidence",
  "Cheque Minimum",
  "Cheque Maximum",
  "Cheque Currency",
  "Cheque Ranges by Stage",
  "Investor Type",
  "Website",
  "LinkedIn",
  "HQ Country",
  "HQ State",
  "HQ City",
  "Stage Focus",
  "Sector Focus",
  "Geography Focus",
  "Business Model Focus",
  "Lead Behavior",
  "AI Appetite",
  "Warm Intro Available",
  "Preferred Contact",
  "Entry Channels",
  "Strengths",
  "Risks",
  "Missing Evidence",
  "Review Needed Fields",
  "Stage Evidence Score",
  "Geography Fit Score",
  "Sector Fit Score",
  "Theme Fit Score",
  "Recent Deal Similarity Score",
  "Customer / ICP Fit Score",
  "Cheque Size Fit Score",
  "Lead Behavior Fit Score",
  "Data Quality Score",
  "Recent Deals",
  "Evidence Source URLs",
] as const;

type CsvValue = string | number | boolean | null | undefined;

function csvCell(value: CsvValue): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function joinValues(values: Array<string | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(" | ");
}

function matchTier(match: MatchResult): string {
  if (match.match_tier) {
    return match.match_tier.replaceAll("_", " ");
  }
  if (match.score >= 80) {
    return "Strong fit";
  }
  if (match.score >= 60) {
    return "Possible fit";
  }
  return "Weak fit";
}

function recentDeals(match: MatchResult): string {
  return joinValues(
    (match.investor_profile?.recent_deals ?? []).map((deal) => {
      const amount =
        deal.amount_text ??
        joinValues([
          deal.amount_currency,
          deal.amount_value === null || deal.amount_value === undefined
            ? null
            : String(deal.amount_value),
        ]);
      const details = joinValues([deal.round, amount, deal.date, deal.role]);
      if (!deal.company) {
        return details;
      }
      return details ? `${deal.company} (${details})` : deal.company;
    }),
  );
}

function evidenceSourceUrls(match: MatchResult): string {
  const urls = new Set<string>();
  for (const evidence of match.evidence) {
    for (const url of evidence.source_urls) {
      if (url) {
        urls.add(url);
      }
    }
  }
  for (const deal of match.investor_profile?.recent_deals ?? []) {
    for (const url of deal.source_urls) {
      if (url) {
        urls.add(url);
      }
    }
    if (deal.investor_evidence_url) {
      urls.add(deal.investor_evidence_url);
    }
  }
  return [...urls].join(" | ");
}

function score(match: MatchResult, key: string): number | "" {
  return match.breakdown[key] ?? "";
}

type ChequeRange = {
  stage: string;
  currency: string;
  minimum: number | null;
  maximum: number | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function chequeRanges(match: MatchResult): ChequeRange[] {
  const profile = match.investor_profile;
  const ranges = (profile?.cheque_ranges ?? []).map((range) => ({
    stage: typeof range.stage === "string" ? range.stage : "All stages",
    currency: typeof range.currency === "string" ? range.currency : "USD",
    minimum: toNumber(range.amount_min),
    maximum: toNumber(range.amount_max),
  }));
  if (ranges.length > 0) {
    return ranges;
  }
  return (profile?.stage_preferences ?? [])
    .map((preference) => ({
      stage: preference.stage ?? "All stages",
      currency: "USD",
      minimum: toNumber(preference.cheque_size_min_usd),
      maximum: toNumber(preference.cheque_size_max_usd),
    }))
    .filter((range) => range.minimum !== null || range.maximum !== null);
}

function compactAmount(value: number | null, currency: string): string {
  if (value === null) {
    return "";
  }
  const amount =
    value >= 1_000_000
      ? `${Number((value / 1_000_000).toFixed(1))}m`
      : value >= 1_000
        ? `${Number((value / 1_000).toFixed(0))}k`
        : value.toLocaleString("en-AU");
  return `${currency} ${amount}`;
}

function chequeRangeLabel(range: ChequeRange): string {
  const minimum = compactAmount(range.minimum, range.currency);
  const maximum = compactAmount(range.maximum, range.currency);
  if (minimum && maximum) {
    return `${range.stage}: ${minimum} - ${maximum}`;
  }
  if (minimum) {
    return `${range.stage}: ${minimum}+`;
  }
  if (maximum) {
    return `${range.stage}: Up to ${maximum}`;
  }
  return "";
}

function chequeSummary(match: MatchResult): {
  minimum: number | "";
  maximum: number | "";
  currencies: string;
  rangesByStage: string;
} {
  const ranges = chequeRanges(match);
  const minimums = ranges
    .map((range) => range.minimum)
    .filter((value): value is number => value !== null);
  const maximums = ranges
    .map((range) => range.maximum)
    .filter((value): value is number => value !== null);
  return {
    minimum: minimums.length > 0 ? Math.min(...minimums) : "",
    maximum: maximums.length > 0 ? Math.max(...maximums) : "",
    currencies: [...new Set(ranges.map((range) => range.currency))].join(" | "),
    rangesByStage: ranges.map(chequeRangeLabel).filter(Boolean).join(" | "),
  };
}

function matchRow(
  match: MatchResult,
  index: number,
  companyName: string,
  exportedAt: string,
): CsvValue[] {
  const profile = match.investor_profile;
  const cheque = chequeSummary(match);
  return [
    companyName,
    exportedAt,
    match.rank ?? index + 1,
    match.investor_id,
    match.investor_name,
    Math.round(match.score * 10) / 10,
    matchTier(match),
    match.routing_pool_label || match.routing_pool,
    match.confidence,
    cheque.minimum,
    cheque.maximum,
    cheque.currencies,
    cheque.rangesByStage,
    profile?.investor_type,
    profile?.website_url,
    profile?.linkedin_url,
    profile?.hq_country,
    profile?.hq_state,
    profile?.hq_city,
    joinValues(profile?.stage_focus ?? []),
    joinValues(profile?.sector_focus ?? []),
    joinValues(profile?.geography_focus ?? []),
    joinValues(profile?.business_model_focus ?? []),
    profile?.lead_behavior,
    profile?.ai_appetite,
    profile?.warm_intro_available ?? false,
    profile?.preferred_channel,
    joinValues(profile?.entry_channels ?? []),
    joinValues(match.strengths),
    joinValues(match.risks),
    joinValues(match.missing_evidence),
    joinValues(match.review_needed_fields),
    score(match, "stage_evidence_depth"),
    score(match, "geography_fit"),
    score(match, "sector_fit"),
    score(match, "theme_fit"),
    score(match, "recent_deal_similarity"),
    score(match, "customer_icp_fit"),
    score(match, "cheque_size_fit"),
    score(match, "lead_behavior_fit"),
    score(match, "data_quality_recency"),
    recentDeals(match),
    evidenceSourceUrls(match),
  ];
}

export function buildMatchResultsCsv(
  matches: MatchResult[],
  companyName: string,
  exportedAt = new Date(),
): string {
  const rows = matches.map((match, index) =>
    matchRow(match, index, companyName, exportedAt.toISOString()),
  );
  return `\uFEFF${[CSV_HEADERS, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}`;
}

function csvFilename(companyName: string, exportedAt: Date): string {
  const companySlug = companyName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const date = exportedAt.toISOString().slice(0, 10);
  return `${companySlug || "company"}-investor-matches-${date}.csv`;
}

export function downloadMatchResultsCsv(
  matches: MatchResult[],
  companyName: string,
): void {
  const exportedAt = new Date();
  const blob = new Blob([buildMatchResultsCsv(matches, companyName, exportedAt)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = csvFilename(companyName, exportedAt);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

import { scoreTier } from "@/features/matching/components/match-result-display";
import type { MatchRecord } from "@/features/matching/types/match";

function profileString(profile: Record<string, unknown>, key: string): string | null {
  const value = profile[key];
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}

/** The structured intake writes "absolute" to mean whole currency units. */
function raiseScale(profile: Record<string, unknown>): string | null {
  const unit = profileString(profile, "target_raise_unit")?.toLowerCase();
  if (!unit || unit === "absolute" || unit === "units") {
    return null;
  }
  return unit;
}

function raiseLabel(profile: Record<string, unknown>): string | null {
  const value = profileString(profile, "target_raise_value");
  if (!value) {
    return null;
  }
  const scale = raiseScale(profile);
  const amount = Number(value);
  const formatted =
    scale === null && Number.isFinite(amount)
      ? new Intl.NumberFormat("en-AU").format(amount)
      : value;
  const parts = [
    profileString(profile, "target_raise_currency"),
    formatted,
    scale,
  ].filter(Boolean);
  return `Raising ${parts.join(" ")}`;
}

export type MatchRecordSummary = {
  companyName: string;
  metaItems: string[];
  matchCount: number;
  topScore: number;
  topInvestorName: string | null;
  strongCount: number;
  possibleCount: number;
};

export function summarizeRecord(record: MatchRecord): MatchRecordSummary {
  const profile = record.response.parsed_company_profile;
  const matches = record.response.matches;
  const top = matches.reduce<(typeof matches)[number] | null>(
    (best, match) => (best === null || match.score > best.score ? match : best),
    null,
  );

  return {
    companyName: profileString(profile, "company_name") ?? "Founder match",
    metaItems: [
      profileString(profile, "stage"),
      profileString(profile, "sector"),
      profileString(profile, "primary_market") ??
        profileString(profile, "company_hq_country"),
      raiseLabel(profile),
    ].filter((item): item is string => Boolean(item)),
    matchCount: matches.length,
    topScore: top?.score ?? 0,
    topInvestorName: top?.investor_name ?? null,
    strongCount: matches.filter((match) => scoreTier(match.score) === "strong").length,
    possibleCount: matches.filter((match) => scoreTier(match.score) === "possible")
      .length,
  };
}

export type MatchHistorySummary = {
  runCount: number;
  matchCount: number;
  strongCount: number;
  lastRunAt: string | null;
};

export function summarizeHistory(records: MatchRecord[]): MatchHistorySummary {
  return records.reduce<MatchHistorySummary>(
    (totals, record) => {
      const summary = summarizeRecord(record);
      return {
        runCount: totals.runCount + 1,
        matchCount: totals.matchCount + summary.matchCount,
        strongCount: totals.strongCount + summary.strongCount,
        lastRunAt:
          totals.lastRunAt === null || record.createdAt > totals.lastRunAt
            ? record.createdAt
            : totals.lastRunAt,
      };
    },
    { runCount: 0, matchCount: 0, strongCount: 0, lastRunAt: null },
  );
}

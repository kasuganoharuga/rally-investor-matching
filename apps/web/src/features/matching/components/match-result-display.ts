import { matchFactorMaximum } from "@/features/matching/components/match-display";
import type { MatchResult } from "@/features/matching/types/match";

export function scoreTier(score: number): "strong" | "possible" | "weak" {
  if (score >= 80) {
    return "strong";
  }
  if (score >= 60) {
    return "possible";
  }
  return "weak";
}

export function tierLabel(match: MatchResult): string {
  const tier = match.match_tier?.replaceAll("_", " ");
  if (tier) {
    return tier;
  }
  const score = scoreTier(match.score);
  if (score === "strong") {
    return "Strong fit";
  }
  if (score === "possible") {
    return "Possible fit";
  }
  return "Weak fit";
}

export function signalPills(
  match: MatchResult,
): { label: string; tone: "good" | "warn" | "bad" }[] {
  const factorOrder = [
    "stage_evidence_depth",
    "sector_fit",
    "theme_fit",
    "recent_deal_similarity",
    "lead_behavior_fit",
    "cheque_size_fit",
  ];
  const entries = factorOrder
    .filter((key) => key in match.breakdown && matchFactorMaximum(match, key) > 0)
    .map((key) => [key, match.breakdown[key]] as const);
  const pills = entries.slice(0, 4).map(([key, value]) => {
    const labels: Record<string, string> = {
      stage_evidence_depth: "Stage evidence",
      geography_fit: "AU/NZ",
      sector_fit: "Sector",
      theme_fit: "Theme",
      recent_deal_similarity: "Deal evidence",
      customer_icp_fit: "ICP",
      cheque_size_fit: "Round size",
      lead_behavior_fit: "Lead",
      data_quality_recency: "Recency",
    };
    const short = labels[key] ?? key.replaceAll("_", " ");
    const factorMax = matchFactorMaximum(match, key);
    const ratio = factorMax > 0 ? value / factorMax : 0;
    const isGood = ratio >= 0.65;
    return {
      label: isGood ? `${short} match` : `${short} partial`,
      tone: isGood ? "good" : "warn",
    } as const;
  });
  if (pills.length > 0) {
    return pills;
  }
  return match.strengths.slice(0, 3).map((item) => ({ label: item, tone: "good" }));
}

export function evidenceLine(match: MatchResult): string {
  const recentDeals = match.investor_profile?.recent_deals ?? [];
  const deals = recentDeals
    .slice(0, 2)
    .map((deal) => {
      const year = deal.date?.slice(0, 4);
      return [deal.company, deal.amount_text, year].filter(Boolean).join(" ");
    })
    .filter(Boolean);
  if (deals.length > 0) {
    return `Recent evidence includes ${deals.join(" and ")}.`;
  }
  return match.strengths[0] ?? "Open the profile to review the available evidence.";
}

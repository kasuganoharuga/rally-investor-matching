import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  factorLabel,
  factorTone,
  titleCase,
} from "@/features/matching/components/match-detail-format";
import {
  MATCH_FACTOR_DETAIL_LABELS,
  matchFactorMaximum,
} from "@/features/matching/components/match-display";
import type { MatchResult } from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

const FACTORS = (
  [
    "stage_evidence_depth",
    "geography_fit",
    "sector_fit",
    "theme_fit",
    "recent_deal_similarity",
    "customer_icp_fit",
    "cheque_size_fit",
    "lead_behavior_fit",
    "data_quality_recency",
  ] as const
).map((key) => ({
  key,
  label: MATCH_FACTOR_DETAIL_LABELS[key] ?? key,
}));

export function MatchDetailBreakdown({
  match,
  companyName,
}: {
  match: MatchResult;
  companyName: string;
}) {
  const matchContext = match.match_context;

  return (
    <section className="rounded-lg border border-primary bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Why {match.investor_name} is a match
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {matchContext?.matched_stage
              ? `${match.investor_name} has observed activity at the ${titleCase(
                  matchContext.matched_stage,
                )} stage that lines up with ${companyName}.`
              : `${match.investor_name} appears relevant for ${companyName} based on observed stage, sector, geography, ICP, and recent deal evidence.`}
          </p>
          {matchContext &&
          (matchContext.sector_matches.length > 0 ||
            matchContext.theme_matches.length > 0) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {matchContext.sector_matches.map((sector) => (
                <Badge key={`sector-${sector}`} variant="secondary">
                  {titleCase(sector)}
                </Badge>
              ))}
              {matchContext.theme_matches.map((theme) => (
                <Badge key={`theme-${theme}`} variant="outline">
                  {titleCase(theme)}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="text-right">
          <span className="text-3xl font-semibold text-primary">
            {Math.round(match.score)}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">/100</span>
        </div>
      </div>

      <div className="mt-5 space-y-4 border-t border-border pt-4">
        {FACTORS.map((factor) => {
          const rawValue = match.breakdown[factor.key] ?? 0;
          const factorMax = matchFactorMaximum(match, factor.key);
          const isWeighted = factorMax > 0;
          const percent = Math.max(
            0,
            Math.min(100, Math.round(isWeighted ? (rawValue / factorMax) * 100 : 0)),
          );
          const tone = factorTone(rawValue, factorMax);
          return (
            <div
              key={factor.key}
              className="grid gap-3 md:grid-cols-[170px_minmax(0,1fr)_88px]"
            >
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  {factor.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rawValue}/{factorMax} pts
                </p>
              </div>
              <Progress
                value={percent}
                className="self-center gap-0"
                trackClassName="h-2"
                indicatorClassName={cn(
                  !isWeighted
                    ? "bg-muted"
                    : tone === "strong"
                      ? "bg-primary"
                      : tone === "partial"
                        ? "bg-warning"
                        : "bg-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "self-center text-right text-sm font-semibold",
                  tone === "strong"
                    ? "text-primary"
                    : tone === "partial"
                      ? "text-warning"
                      : "text-muted-foreground",
                )}
              >
                {isWeighted ? factorLabel(tone) : "Not weighted"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

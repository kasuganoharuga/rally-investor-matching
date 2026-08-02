import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/features/matching/components/match-detail-format";
import type { MatchResult } from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

import { VcMatchFactorBar } from "./vc-match-factor-bar";

const FACTOR_ORDER = [
  "stage_evidence_depth",
  "geography_fit",
  "sector_fit",
  "theme_fit",
  "recent_deal_similarity",
  "customer_icp_fit",
  "cheque_size_fit",
  "lead_behavior_fit",
  "data_quality_recency",
] as const;

/**
 * The score-specific counterpart to VcFitPanel: instead of "who this investor
 * generally suits" it answers "why this score, for this company" — the one
 * conclusion that only exists in a match context, not on the investor's own
 * profile page.
 */
export function VcMatchVerdict({
  match,
  companyName,
}: {
  match: MatchResult;
  companyName: string;
}) {
  const matchContext = match.match_context;
  const warmIntro = Boolean(match.investor_profile?.warm_intro_available);
  const risks = match.risks.slice(0, 3);

  return (
    <aside className="space-y-3 lg:sticky lg:top-6">
      <section className="rounded-lg border border-primary bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Why {match.investor_name} is a match
          </h2>
          <div className="shrink-0 text-right">
            <span className="text-2xl font-semibold text-primary">
              {Math.round(match.score)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">/100</span>
          </div>
        </div>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {matchContext?.matched_stage
            ? `Observed activity at the ${titleCase(
                matchContext.matched_stage,
              )} stage lines up with ${companyName}.`
            : `Relevant to ${companyName} based on observed stage, sector, geography, ICP, and deal evidence.`}
        </p>

        {matchContext &&
        (matchContext.sector_matches.length > 0 ||
          matchContext.theme_matches.length > 0) ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
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

        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {FACTOR_ORDER.map((key) => (
            <VcMatchFactorBar key={key} match={match} factorKey={key} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">Intro status</span>
          <span
            className={cn("font-semibold", warmIntro ? "text-primary" : "text-warning")}
          >
            {warmIntro ? "Path available" : "Path not confirmed"}
          </span>
        </div>

        {risks.length > 0 ? (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-warning uppercase">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              Watch-outs
            </h3>
            <ul className="mt-2 space-y-1.5">
              {risks.map((risk) => (
                <li
                  key={risk}
                  className="flex gap-2 text-sm leading-6 text-muted-foreground"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </aside>
  );
}

import { ArrowLeft, CircleCheck, Download, RefreshCw, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchingConfigurationSummary } from "@/features/matching/components/matching-configuration-summary";
import {
  CAPACITY_COVERAGE_MULTIPLIER,
  estimateInvestmentCapacity,
  formatCompactCurrency,
} from "@/features/matching/components/match-investment-capacity";
import { MatchResultRow } from "@/features/matching/components/match-result-row";
import { scoreTier } from "@/features/matching/components/match-result-display";
import { downloadMatchResultsCsv } from "@/features/matching/components/match-results-csv";
import type {
  IntakeResponse,
  MatchingConfiguration,
} from "@/features/matching/types/match";
import type { StructuredIntakeValues } from "@/features/matching/types/structured-intake";

export function MatchResultsScreen({
  response,
  structuredIntake,
  showCalculationDetails,
  matchingConfiguration,
  matchedAt,
  onSelectMatch,
  onBack,
  onRematch,
}: {
  response: IntakeResponse;
  structuredIntake: StructuredIntakeValues | null;
  showCalculationDetails: boolean;
  matchingConfiguration: MatchingConfiguration | null;
  matchedAt: string;
  onSelectMatch: (investorId: string) => void;
  onBack: () => void;
  onRematch: () => void;
}) {
  const matches = response.matches;
  const strongCount = matches.filter(
    (match) => scoreTier(match.score) === "strong",
  ).length;
  const possibleCount = matches.filter(
    (match) => scoreTier(match.score) === "possible",
  ).length;
  const weakCount = matches.length - strongCount - possibleCount;
  const capacityEstimate = estimateInvestmentCapacity(matches.length, structuredIntake);
  const companyName =
    typeof response.parsed_company_profile.company_name === "string"
      ? response.parsed_company_profile.company_name
      : "Current company";

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 md:px-7 md:py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to history
      </button>

      <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {matches.length} investor matches found
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Top matches are ranked by evidence-backed fit across stage, sector,
              geography, cheque size, and lead behaviour.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">• {strongCount} strong fit</Badge>
              <Badge variant="warning">• {possibleCount} possible</Badge>
              <Badge variant="outline">• {weakCount} weak</Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" size="lg" onClick={onRematch}>
                <RefreshCw className="size-4" aria-hidden="true" />
                Rematch
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => downloadMatchResultsCsv(matches, companyName)}
              >
                <Download className="size-4" aria-hidden="true" />
                Download CSV
              </Button>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{companyName}</p>
              <p>
                Matched{" "}
                {new Intl.DateTimeFormat("en-AU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(matchedAt))}
              </p>
            </div>
          </div>
        </div>

        {matchingConfiguration ? (
          <MatchingConfigurationSummary
            configuration={matchingConfiguration}
            className="mt-4 border-t border-border pt-4"
          />
        ) : null}
      </div>

      {capacityEstimate ? (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Users className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Estimated matched capacity / raise target
                </p>
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {formatCompactCurrency(
                    capacityEstimate.matchedAmount,
                    capacityEstimate.currency,
                  )}{" "}
                  /{" "}
                  {formatCompactCurrency(
                    capacityEstimate.targetAmount,
                    capacityEstimate.currency,
                  )}
                </p>
              </div>
            </div>
            <div
              className={
                capacityEstimate.isEnough
                  ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  : "inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/15 px-4 py-2 text-sm font-semibold text-foreground"
              }
            >
              {capacityEstimate.isEnough ? (
                <CircleCheck className="size-4" aria-hidden="true" />
              ) : (
                <Users className="size-4" aria-hidden="true" />
              )}
              {capacityEstimate.isEnough
                ? "Likely enough for this raise"
                : "More investors likely needed"}
            </div>
          </div>

          {showCalculationDetails ? (
            <details className="mt-3 rounded-lg border border-border bg-card px-5 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground marker:text-primary">
                Click to see how this is calculated
              </summary>
              <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Matched capacity:</span>{" "}
                  {formatCompactCurrency(
                    capacityEstimate.leadAmount,
                    capacityEstimate.currency,
                  )}{" "}
                  lead estimate + {capacityEstimate.nonLeadCount} x{" "}
                  {formatCompactCurrency(
                    capacityEstimate.nonLeadAmount,
                    capacityEstimate.currency,
                  )}{" "}
                  participant estimate ={" "}
                  {formatCompactCurrency(
                    capacityEstimate.matchedAmount,
                    capacityEstimate.currency,
                  )}
                </p>
                <p>
                  <span className="font-medium text-foreground">Enough threshold:</span>{" "}
                  {formatCompactCurrency(
                    capacityEstimate.targetAmount,
                    capacityEstimate.currency,
                  )}{" "}
                  x {CAPACITY_COVERAGE_MULTIPLIER} ={" "}
                  {formatCompactCurrency(
                    capacityEstimate.requiredAmount,
                    capacityEstimate.currency,
                  )}
                </p>
                <p>
                  Capacity is marked as enough only when it reaches 1.5x the raise
                  target, allowing for matches that may not convert into investments.
                </p>
              </div>
            </details>
          ) : null}
        </>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-primary pb-3">
        <span className="rounded-full border border-primary bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
          All ({matches.length})
        </span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Sort by
          <span className="rounded-full border border-border bg-card px-4 py-1.5 font-semibold text-foreground">
            Best fit
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {matches.map((match) => (
          <MatchResultRow
            key={match.investor_id}
            match={match}
            onSelect={onSelectMatch}
          />
        ))}
      </div>
    </section>
  );
}

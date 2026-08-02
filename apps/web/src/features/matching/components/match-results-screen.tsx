import { ArrowLeft, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchResultRow } from "@/features/matching/components/match-result-row";
import { scoreTier } from "@/features/matching/components/match-result-display";
import { downloadMatchResultsCsv } from "@/features/matching/components/match-results-csv";
import type { IntakeResponse } from "@/features/matching/types/match";

export function MatchResultsScreen({
  response,
  onSelectMatch,
  onBack,
}: {
  response: IntakeResponse;
  onSelectMatch: (investorId: string) => void;
  onBack: () => void;
}) {
  const matches = response.matches;
  const strongCount = matches.filter(
    (match) => scoreTier(match.score) === "strong",
  ).length;
  const possibleCount = matches.filter(
    (match) => scoreTier(match.score) === "possible",
  ).length;
  const weakCount = matches.length - strongCount - possibleCount;
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
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => downloadMatchResultsCsv(matches, companyName)}
            >
              <Download className="size-4" aria-hidden="true" />
              Download CSV
            </Button>
            <div className="text-right text-sm text-muted-foreground">
              <p>{companyName}</p>
              <p>Matched {new Intl.DateTimeFormat("en-AU").format(new Date())}</p>
            </div>
          </div>
        </div>
      </div>

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

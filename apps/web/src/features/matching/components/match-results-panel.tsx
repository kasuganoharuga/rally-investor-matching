"use client";

import { Loader2 } from "lucide-react";

import { FounderProfileSummary } from "./founder-profile-summary";
import { MatchHistoryPanel } from "./match-history-panel";
import { MatchResultCard } from "./match-result-card";
import { VcDetailPanel } from "./vc-detail-panel";
import type { MatchRecord } from "@/features/matching/hooks/use-match-intake";
import type { IntakeResponse } from "@/features/matching/types/match";

type MatchResultsPanelProps = {
  response: IntakeResponse | null;
  records: MatchRecord[];
  isSubmitting: boolean;
  selectedMatchId: string | null;
  onSelectMatch: (investorId: string) => void;
  onBackToResults: () => void;
};

function MatchingProgress() {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">Matching in progress</p>
          <p className="text-sm text-muted-foreground">
            Extracted summary first, ranked investor evidence next.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {["Parsing company", "Retrieving RAG chunks", "Scoring 10 factors"].map(
          (item) => (
            <div key={item} className="rounded-lg bg-background px-3 py-2 text-sm">
              {item}
            </div>
          ),
        )}
      </div>
    </section>
  );
}

export function MatchResultsPanel({
  response,
  records,
  isSubmitting,
  selectedMatchId,
  onSelectMatch,
  onBackToResults,
}: MatchResultsPanelProps) {
  const matches = response?.matches ?? [];
  const selectedMatch =
    matches.find((match) => match.investor_id === selectedMatchId) ?? null;

  if (selectedMatch) {
    return <VcDetailPanel match={selectedMatch} onBack={onBackToResults} />;
  }

  return (
    <section className="space-y-4">
      <FounderProfileSummary response={response} />

      {isSubmitting ? <MatchingProgress /> : null}

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Ranked results
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Top investor matches
            </h2>
          </div>
          {matches.length > 0 ? (
            <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              {matches.length} shown
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {matches.length === 0 && !isSubmitting ? (
            <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              No ranked results yet.
            </div>
          ) : null}

          {matches.map((match) => (
            <MatchResultCard
              key={match.investor_id}
              match={match}
              selected={match.investor_id === selectedMatchId}
              onSelect={onSelectMatch}
            />
          ))}
        </div>
      </section>

      <MatchHistoryPanel records={records} />
    </section>
  );
}

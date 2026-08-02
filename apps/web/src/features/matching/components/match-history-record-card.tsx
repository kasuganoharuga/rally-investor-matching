import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatRecordDate } from "@/features/matching/components/match-display";
import { summarizeRecord } from "@/features/matching/components/match-history-summary";
import { ScoreRing } from "@/features/matching/components/score-ring";
import type { MatchRecord } from "@/features/matching/types/match";

export function MatchHistoryRecordCard({ record }: { record: MatchRecord }) {
  const summary = summarizeRecord(record);

  return (
    <Link
      href={`/match/${record.id}`}
      className="group block rounded-lg border border-border bg-card px-5 py-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <ScoreRing score={summary.topScore} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-foreground">
              {summary.companyName}
            </h2>
            {summary.strongCount > 0 ? (
              <Badge variant="secondary">• {summary.strongCount} strong fit</Badge>
            ) : null}
            {summary.possibleCount > 0 ? (
              <Badge variant="warning">• {summary.possibleCount} possible</Badge>
            ) : null}
          </div>

          {summary.metaItems.length > 0 ? (
            <p className="mt-1.5 truncate text-sm text-muted-foreground">
              {summary.metaItems.join(" · ")}
            </p>
          ) : null}

          {summary.topInvestorName ? (
            <p className="mt-2 truncate text-sm text-muted-foreground">
              <span className="text-xs font-bold uppercase text-muted-foreground/70">
                Top match{" "}
              </span>
              <span className="font-medium text-foreground">
                {summary.topInvestorName}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-start gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {summary.matchCount} matches
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatRecordDate(record.createdAt)}
            </p>
          </div>
          <ChevronRight
            className="mt-0.5 size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}

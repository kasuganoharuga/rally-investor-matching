import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  evidenceSummary,
  leadDealCount,
  typicalCheque,
} from "@/features/matching/components/match-detail-format";
import type { MatchRecentDeal, MatchResult } from "@/features/matching/types/match";

export function MatchDetailEvidence({
  match,
  comparableDeals,
  isLegacyMatch,
}: {
  match: MatchResult;
  comparableDeals: MatchRecentDeal[];
  isLegacyMatch: boolean;
}) {
  const profile = match.investor_profile;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isLegacyMatch ? "Evidence snapshot" : "Comparable deal evidence"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLegacyMatch
              ? "This result predates per-stage evidence filtering, so all recent deals are shown."
              : "The comparable deals this match is based on, and why each one matters."}
          </p>
        </div>
        <Button
          variant="link"
          className="h-auto p-0 text-sm font-semibold"
          render={<Link href={`/investors/${match.investor_id}?from=match`} />}
        >
          View full profile
        </Button>
      </div>

      {comparableDeals.length > 0 ? (
        <>
          <div className="mt-4 grid overflow-hidden rounded-lg bg-primary text-primary-foreground md:grid-cols-3">
            <div className="border-b border-white/15 p-5 md:border-b-0 md:border-r">
              <p className="text-3xl font-semibold text-secondary">
                {Math.min(comparableDeals.length, 99)}
              </p>
              <p className="mt-1 text-sm opacity-80">
                {isLegacyMatch ? "tracked" : "comparable"} deals
              </p>
            </div>
            <div className="border-b border-white/15 p-5 md:border-b-0 md:border-r">
              <p className="text-3xl font-semibold text-secondary">
                {typicalCheque(profile)}
              </p>
              <p className="mt-1 text-sm opacity-80">cheque range on profile</p>
            </div>
            <div className="p-5">
              <p className="text-3xl font-semibold text-secondary">
                {leadDealCount(comparableDeals)} of {comparableDeals.length}
              </p>
              <p className="mt-1 text-sm opacity-80">led or anchored the round</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
            {evidenceSummary(comparableDeals)}
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
          No directly comparable deals are attached to this match yet.
        </p>
      )}
    </section>
  );
}

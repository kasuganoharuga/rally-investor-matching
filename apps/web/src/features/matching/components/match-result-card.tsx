import { ChevronRight, Gauge } from "lucide-react";

import { labelFromKey, orderedBreakdownEntries } from "./match-display";
import { cn } from "@/lib/utils";
import type { MatchResult } from "@/features/matching/types/match";

type MatchResultCardProps = {
  match: MatchResult;
  selected: boolean;
  onSelect: (investorId: string) => void;
};

export function MatchResultCard({ match, selected, onSelect }: MatchResultCardProps) {
  const poolRank = match.pool_rank ?? match.rank ?? "-";

  return (
    <button
      type="button"
      onClick={() => onSelect(match.investor_id)}
      className={cn(
        "w-full rounded-lg border bg-card p-4 text-left shadow-sm transition hover:border-primary/60 hover:shadow-md",
        selected ? "border-primary ring-2 ring-primary/15" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {match.routing_pool_label} #{poolRank}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-foreground">
            {match.investor_name}
          </h3>
          {match.match_tier ? (
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {match.match_tier.replaceAll("_", " ")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-primary-foreground">
          <Gauge className="size-4" aria-hidden="true" />
          <span className="font-semibold">{match.score}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {orderedBreakdownEntries(match.breakdown)
          .slice(0, 4)
          .map(([key, value]) => (
            <div key={key} className="rounded-lg bg-background px-2 py-1.5">
              <p className="truncate text-[11px] text-muted-foreground">
                {labelFromKey(key)}
              </p>
              <p className="text-sm font-semibold text-foreground">{value}</p>
            </div>
          ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="line-clamp-1">
          {match.strengths[0] ?? "Open detail for evidence"}
        </span>
        <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
      </div>
    </button>
  );
}

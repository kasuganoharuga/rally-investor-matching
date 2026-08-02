import { Badge } from "@/components/ui/badge";
import {
  evidenceLine,
  scoreTier,
  signalPills,
  tierLabel,
} from "@/features/matching/components/match-result-display";
import { ScoreRing } from "@/features/matching/components/score-ring";
import type { MatchResult } from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

export function MatchResultRow({
  match,
  onSelect,
}: {
  match: MatchResult;
  onSelect: (investorId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(match.investor_id)}
      className={cn(
        "w-full rounded-lg border bg-card px-5 py-4 text-left shadow-sm transition hover:border-primary hover:shadow-md",
        match.rank === 1 ? "border-primary" : "border-border",
      )}
    >
      <div className="flex items-start gap-4">
        <ScoreRing score={match.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {match.investor_name}
            </h2>
            <Badge
              variant={
                scoreTier(match.score) === "strong"
                  ? "secondary"
                  : scoreTier(match.score) === "possible"
                    ? "warning"
                    : "outline"
              }
              className="capitalize"
            >
              {tierLabel(match)}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {match.strengths[0] ??
              "Potential investor fit based on available profile data."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase text-muted-foreground">
              Signals
            </span>
            {signalPills(match).map((pill) => (
              <Badge
                key={pill.label}
                variant={pill.tone === "good" ? "outline" : "warning"}
              >
                {pill.label}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-bold uppercase text-muted-foreground/70">
              Evidence{" "}
            </span>
            {evidenceLine(match)}
          </p>
        </div>
        <div className="hidden min-w-44 text-right md:block">
          {match.investor_profile?.warm_intro_available ? (
            <Badge variant="secondary">• Intro path available</Badge>
          ) : (
            <Badge variant="outline">• Relationship unknown</Badge>
          )}
        </div>
      </div>
    </button>
  );
}

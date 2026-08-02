import { Progress } from "@/components/ui/progress";
import {
  MATCH_FACTOR_DETAIL_LABELS,
  matchFactorMaximum,
} from "@/features/matching/components/match-display";
import {
  factorLabel,
  factorTone,
} from "@/features/matching/components/match-detail-format";
import type { MatchResult } from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

export function VcMatchFactorBar({
  match,
  factorKey,
}: {
  match: MatchResult;
  factorKey: string;
}) {
  const rawValue = match.breakdown[factorKey] ?? 0;
  const factorMax = matchFactorMaximum(match, factorKey);
  const isWeighted = factorMax > 0;
  const percent = Math.max(
    0,
    Math.min(100, isWeighted ? (rawValue / factorMax) * 100 : 0),
  );
  const tone = factorTone(rawValue, factorMax);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">
          {MATCH_FACTOR_DETAIL_LABELS[factorKey] ?? factorKey}
        </span>
        <span
          className={cn(
            "font-semibold",
            !isWeighted
              ? "text-muted-foreground"
              : tone === "strong"
                ? "text-primary"
                : tone === "partial"
                  ? "text-warning"
                  : "text-muted-foreground",
          )}
        >
          {isWeighted ? factorLabel(tone) : "Not weighted"}
        </span>
      </div>
      <Progress
        value={percent}
        className="gap-0"
        trackClassName="h-1.5"
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
    </div>
  );
}

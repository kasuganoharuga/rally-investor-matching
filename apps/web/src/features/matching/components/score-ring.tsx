import { scoreTier } from "@/features/matching/components/match-result-display";
import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = "lg",
}: {
  score: number;
  size?: "sm" | "lg";
}) {
  const tier = scoreTier(score);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-card font-bold text-foreground",
        size === "sm" ? "size-11 border-[3px] text-xs" : "size-14 border-4 text-sm",
        tier === "strong"
          ? "border-primary"
          : tier === "possible"
            ? "border-warning"
            : "border-muted-foreground/40",
      )}
    >
      {Math.round(score)}
    </div>
  );
}

import { SlidersHorizontal } from "lucide-react";

import { MATCH_FACTOR_DETAIL_LABELS } from "@/features/matching/components/match-display";
import {
  INVESTOR_TYPE_LABELS,
  type MatchingConfiguration,
  type MatchingWeightKey,
} from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

const WEIGHT_FACTORS = (
  Object.keys(MATCH_FACTOR_DETAIL_LABELS) as MatchingWeightKey[]
).map((key) => ({ key, label: MATCH_FACTOR_DETAIL_LABELS[key] }));

export function MatchingConfigurationSummary({
  configuration,
  compact = false,
  className,
}: {
  configuration: MatchingConfiguration;
  compact?: boolean;
  className?: string;
}) {
  const enabledRules = [
    configuration.hard_filters.stage ? "Same-stage evidence" : null,
    configuration.hard_filters.geography ? "Geographic eligibility" : null,
  ].filter((value): value is string => Boolean(value));
  const excludedTypes = configuration.excluded_investor_types.map(
    (type) => INVESTOR_TYPE_LABELS[type],
  );

  return (
    <div className={cn(className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground/70">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Weights
        </span>
        {WEIGHT_FACTORS.map((factor) => (
          <span
            key={factor.key}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground",
              !compact && "px-2.5 py-1",
            )}
          >
            {factor.label}
            <strong className="font-semibold text-foreground">
              {configuration.weights[factor.key]}
            </strong>
          </span>
        ))}
      </div>

      {!compact ? (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span>Results: up to {configuration.result_limit}</span>
          <span>
            Eligibility: {enabledRules.length > 0 ? enabledRules.join(" + ") : "None"}
          </span>
          {excludedTypes.length > 0 ? (
            <span>Excluded: {excludedTypes.join(", ")}</span>
          ) : (
            <span>Excluded investor types: none</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

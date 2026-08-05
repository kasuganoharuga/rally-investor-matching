import { RotateCcw, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MATCH_FACTOR_DETAIL_LABELS } from "@/features/matching/components/match-display";
import {
  DEFAULT_MATCHING_CONFIGURATION,
  type MatchingConfiguration,
  type MatchingWeightKey,
} from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

const SCORE_FACTORS: { key: MatchingWeightKey; label: string }[] = (
  Object.keys(MATCH_FACTOR_DETAIL_LABELS) as MatchingWeightKey[]
).map((key) => ({ key, label: MATCH_FACTOR_DETAIL_LABELS[key] }));

function cloneDefaultConfiguration(): MatchingConfiguration {
  return {
    weights: { ...DEFAULT_MATCHING_CONFIGURATION.weights },
    hard_filters: { ...DEFAULT_MATCHING_CONFIGURATION.hard_filters },
    result_limit: DEFAULT_MATCHING_CONFIGURATION.result_limit,
    excluded_investor_types: [],
  };
}

export function StructuredIntakeScoringWeights({
  configuration,
  disabled,
  onChange,
}: {
  configuration: MatchingConfiguration;
  disabled: boolean;
  onChange: (configuration: MatchingConfiguration) => void;
}) {
  const totalWeight = Object.values(configuration.weights).reduce(
    (total, value) => total + value,
    0,
  );
  const hasValidTotal = totalWeight === 100;
  const resultLimit =
    configuration.result_limit ?? DEFAULT_MATCHING_CONFIGURATION.result_limit;

  function updateWeight(key: MatchingWeightKey, value: number) {
    onChange({
      ...configuration,
      result_limit: resultLimit,
      weights: {
        ...configuration.weights,
        [key]: Math.min(100, Math.max(0, Math.round(value))),
      },
    });
  }

  return (
    <section className="p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="text-base font-semibold text-foreground">
            Ranking priorities
          </h2>
          <Badge variant="outline">Internal test</Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange(cloneDefaultConfiguration())}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SCORE_FACTORS.map((factor) => {
          const value = configuration.weights[factor.key];
          return (
            <div
              key={factor.key}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <label
                htmlFor={`score-${factor.key}`}
                className="truncate text-sm font-medium text-foreground"
                title={factor.label}
              >
                {factor.label}
              </label>
              <div className="relative w-20 shrink-0">
                <Input
                  id={`score-${factor.key}`}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={value}
                  disabled={disabled}
                  onChange={(event) =>
                    updateWeight(factor.key, Number(event.target.value))
                  }
                  className="h-9 pr-7 text-right"
                />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
                  pt
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "mt-4 flex items-center justify-between gap-4 rounded-md border px-4 py-3",
          hasValidTotal
            ? "border-primary/25 bg-primary/5"
            : "border-warning/40 bg-warning/10",
        )}
      >
        <span className="text-sm font-semibold text-foreground">
          Total score weight
        </span>
        <span
          className={cn(
            "text-sm font-semibold",
            hasValidTotal ? "text-primary" : "text-warning",
          )}
        >
          {totalWeight}/100
        </span>
      </div>
    </section>
  );
}

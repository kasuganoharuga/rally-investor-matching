"use client";

import { ListOrdered, RotateCcw, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_MATCHING_CONFIGURATION,
  MAX_MATCH_RESULT_LIMIT,
  MIN_MATCH_RESULT_LIMIT,
  type HardFilterSettings,
  type MatchingConfiguration,
  type MatchingWeightKey,
} from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

const SCORE_FACTORS: {
  key: MatchingWeightKey;
  label: string;
  description: string;
}[] = [
  {
    key: "stage_evidence_depth",
    label: "Same-round investment evidence",
    description: "Observed investments at the company's current fundraising stage.",
  },
  {
    key: "geography_fit",
    label: "Geographic mandate fit",
    description: "Evidence that the investor can invest in the company's market.",
  },
  {
    key: "sector_fit",
    label: "Industry fit",
    description: "Overlap with the company's broad industry.",
  },
  {
    key: "theme_fit",
    label: "Specific investment focus fit",
    description: "Overlap with the company's more precise product or use-case focus.",
  },
  {
    key: "recent_deal_similarity",
    label: "Similar recent investments",
    description: "Comparable companies backed recently by the investor.",
  },
  {
    key: "customer_icp_fit",
    label: "Customer and buyer fit",
    description: "Alignment with the customers and buyers the company serves.",
  },
  {
    key: "cheque_size_fit",
    label: "Cheque size fit",
    description: "Alignment between the raise and observed investment amounts.",
  },
  {
    key: "lead_behavior_fit",
    label: "Lead investor fit",
    description: "Evidence that the investor's role matches the company's lead need.",
  },
  {
    key: "data_quality_recency",
    label: "Data freshness and quality",
    description: "Strength and recency of the evidence behind the investor profile.",
  },
];

const HARD_FILTERS: {
  key: keyof HardFilterSettings;
  label: string;
  description: string;
}[] = [
  {
    key: "stage",
    label: "Require same-stage evidence",
    description:
      "Exclude investors without observed investments at this fundraising stage.",
  },
  {
    key: "geography",
    label: "Require geographic eligibility",
    description:
      "Exclude investors whose observed mandate does not cover the company's market.",
  },
];

function cloneDefaultConfiguration(): MatchingConfiguration {
  return {
    weights: { ...DEFAULT_MATCHING_CONFIGURATION.weights },
    hard_filters: { ...DEFAULT_MATCHING_CONFIGURATION.hard_filters },
    result_limit: DEFAULT_MATCHING_CONFIGURATION.result_limit,
  };
}

export function StructuredIntakeScoring({
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

  function updateHardFilter(key: keyof HardFilterSettings, value: boolean) {
    onChange({
      ...configuration,
      result_limit: resultLimit,
      hard_filters: {
        ...configuration.hard_filters,
        [key]: value,
      },
    });
  }

  function updateResultLimit(value: number) {
    onChange({
      ...configuration,
      result_limit: Math.min(
        MAX_MATCH_RESULT_LIMIT,
        Math.max(MIN_MATCH_RESULT_LIMIT, Math.round(value)),
      ),
    });
  }

  return (
    <div className="divide-y divide-border">
      <section className="p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <SlidersHorizontal className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  Ranking priorities
                </h2>
                <span className="rounded-full border border-secondary/70 bg-secondary/20 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                  Internal test
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Set how much each signal contributes to the 100-point match score.
              </p>
            </div>
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

        <div className="mt-6 divide-y divide-border border-y border-border">
          {SCORE_FACTORS.map((factor) => {
            const value = configuration.weights[factor.key];
            return (
              <div
                key={factor.key}
                className="grid gap-3 py-4 md:grid-cols-[minmax(240px,1fr)_minmax(220px,1.2fr)_84px] md:items-center"
              >
                <div>
                  <label
                    htmlFor={`score-${factor.key}`}
                    className="text-sm font-semibold text-foreground"
                  >
                    {factor.label}
                  </label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {factor.description}
                  </p>
                </div>
                <input
                  id={`score-${factor.key}`}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={value}
                  disabled={disabled}
                  onChange={(event) =>
                    updateWeight(factor.key, Number(event.target.value))
                  }
                  className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={value}
                    disabled={disabled}
                    aria-label={`${factor.label} score weight`}
                    onChange={(event) =>
                      updateWeight(factor.key, Number(event.target.value))
                    }
                    className="h-10 pr-8 text-right"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                    pts
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
              : "border-amber-300 bg-amber-50",
          )}
        >
          <span className="text-sm font-semibold text-foreground">
            Total score weight
          </span>
          <span
            className={cn(
              "text-sm font-semibold",
              hasValidTotal ? "text-primary" : "text-amber-800",
            )}
          >
            {totalWeight}/100
          </span>
        </div>
      </section>

      <section className="p-5 md:p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary/25 text-primary">
            <ShieldCheck className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Eligibility rules</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose which mismatches are removed before investors are ranked.
            </p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-border border-y border-border">
          {HARD_FILTERS.map((filter) => {
            const isEnabled = configuration.hard_filters[filter.key];
            return (
              <div
                key={filter.key}
                className="flex items-center justify-between gap-5 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {filter.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {filter.description}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={filter.label}
                  disabled={disabled}
                  onClick={() => updateHardFilter(filter.key, !isEnabled)}
                  className={cn(
                    "relative h-7 w-12 shrink-0 rounded-full border transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                    isEnabled ? "border-primary bg-primary" : "border-border bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
                      isEnabled ? "translate-x-5" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="p-5 md:p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ListOrdered className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Result count</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose how many ranked investors this test should return.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-[minmax(220px,1fr)_96px] md:items-center">
          <div>
            <label
              htmlFor="match-result-limit"
              className="text-sm font-semibold text-foreground"
            >
              Ranked investors
            </label>
            <input
              type="range"
              min={MIN_MATCH_RESULT_LIMIT}
              max={MAX_MATCH_RESULT_LIMIT}
              step={1}
              value={resultLimit}
              disabled={disabled}
              aria-label="Result count slider"
              onChange={(event) => updateResultLimit(Number(event.target.value))}
              className="mt-3 h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{MIN_MATCH_RESULT_LIMIT}</span>
              <span>{MAX_MATCH_RESULT_LIMIT}</span>
            </div>
          </div>
          <div className="relative">
            <Input
              id="match-result-limit"
              type="number"
              min={MIN_MATCH_RESULT_LIMIT}
              max={MAX_MATCH_RESULT_LIMIT}
              step={1}
              value={resultLimit}
              disabled={disabled}
              onChange={(event) => updateResultLimit(Number(event.target.value))}
              className="h-11 pr-14 text-right"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
              results
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

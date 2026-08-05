"use client";

import { ListOrdered, ShieldCheck, UserRoundX } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelectField } from "@/features/matching/components/structured-intake-controls";
import { StructuredIntakeScoringWeights } from "@/features/matching/components/structured-intake-scoring-weights";
import {
  DEFAULT_MATCHING_CONFIGURATION,
  INVESTOR_TYPE_LABELS,
  INVESTOR_TYPE_VALUES,
  MAX_MATCH_RESULT_LIMIT,
  MIN_MATCH_RESULT_LIMIT,
  type HardFilterSettings,
  type MatchingConfiguration,
} from "@/features/matching/types/match";
import type { IntakeOption } from "@/features/matching/types/structured-intake";
import { cn } from "@/lib/utils";

const INVESTOR_TYPE_OPTIONS: IntakeOption[] = INVESTOR_TYPE_VALUES.map((value) => ({
  value,
  label: INVESTOR_TYPE_LABELS[value],
}));

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
    description: "Exclude investors whose observed mandate does not cover the market.",
  },
];

export function StructuredIntakeScoring({
  configuration,
  disabled,
  onChange,
}: {
  configuration: MatchingConfiguration;
  disabled: boolean;
  onChange: (configuration: MatchingConfiguration) => void;
}) {
  const resultLimit =
    configuration.result_limit ?? DEFAULT_MATCHING_CONFIGURATION.result_limit;

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

  function updateExcludedInvestorTypes(values: string[]) {
    onChange({
      ...configuration,
      result_limit: resultLimit,
      excluded_investor_types: values.filter((value) =>
        INVESTOR_TYPE_VALUES.includes(value as (typeof INVESTOR_TYPE_VALUES)[number]),
      ) as MatchingConfiguration["excluded_investor_types"],
    });
  }

  return (
    <div className="divide-y divide-border">
      <StructuredIntakeScoringWeights
        configuration={configuration}
        disabled={disabled}
        onChange={onChange}
      />

      <section className="p-5 md:p-7">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">Eligibility rules</h2>
        </div>

        <div className="mt-4 space-y-3">
          {HARD_FILTERS.map((filter) => (
            <label
              key={filter.key}
              htmlFor={`filter-${filter.key}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border border-border p-3",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <Checkbox
                id={`filter-${filter.key}`}
                checked={configuration.hard_filters[filter.key]}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  updateHardFilter(filter.key, checked === true)
                }
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {filter.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {filter.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="p-5 md:p-7">
        <div className="flex items-center gap-2">
          <UserRoundX className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">
            Investor type exclusions
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Selected investor categories will be removed before ranking begins.
        </p>

        <div className="mt-4 max-w-xl">
          <MultiSelectField
            label="Investor types to exclude"
            placeholder="No investor types excluded"
            options={INVESTOR_TYPE_OPTIONS}
            selected={configuration.excluded_investor_types}
            maxSelected={INVESTOR_TYPE_OPTIONS.length}
            disabled={disabled}
            onChange={updateExcludedInvestorTypes}
          />
        </div>
      </section>

      <section className="p-5 md:p-7">
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">Result count</h2>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <Label htmlFor="match-result-limit" className="text-sm font-medium">
            Ranked investors to return
          </Label>
          <div className="relative w-32 shrink-0">
            <Input
              id="match-result-limit"
              type="number"
              min={MIN_MATCH_RESULT_LIMIT}
              max={MAX_MATCH_RESULT_LIMIT}
              step={1}
              value={resultLimit}
              disabled={disabled}
              onChange={(event) => updateResultLimit(Number(event.target.value))}
              className="h-9 pr-14 text-right"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
              of {MAX_MATCH_RESULT_LIMIT}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { Banknote } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SelectField } from "@/features/matching/components/structured-intake-controls";
import {
  CURRENCY_OPTIONS,
  LEAD_NEED_OPTIONS,
  STAGE_OPTIONS,
  type StructuredIntakeValues,
} from "@/features/matching/types/structured-intake";

export function FundraiseFields({
  values,
  disabled,
  onChange,
}: {
  values: StructuredIntakeValues;
  disabled: boolean;
  onChange: (
    field: "stage" | "raiseAmount" | "raiseCurrency" | "leadNeeded",
    value: string,
  ) => void;
}) {
  return (
    <fieldset className="grid gap-5 p-5 md:p-7" disabled={disabled}>
      <legend className="sr-only">Fundraise</legend>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Banknote className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Fundraise</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Round stage, target amount, and lead requirement.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <SelectField
          id="fundraise-stage"
          label="Stage"
          value={values.stage}
          options={STAGE_OPTIONS}
          required
          onChange={(value) => onChange("stage", value)}
        />

        <div className="grid gap-2">
          <label
            htmlFor="raise-amount"
            className="text-sm font-semibold text-foreground"
          >
            Target raise amount
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id="raise-amount"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={values.raiseAmount}
            onChange={(event) => onChange("raiseAmount", event.target.value)}
            placeholder="1500000"
          />
          <p className="text-xs text-muted-foreground">
            Enter the full number without commas.
          </p>
        </div>

        <SelectField
          id="raise-currency"
          label="Currency"
          value={values.raiseCurrency}
          options={CURRENCY_OPTIONS}
          required
          onChange={(value) => onChange("raiseCurrency", value)}
        />
      </div>

      <div className="max-w-md">
        <SelectField
          id="lead-needed"
          label="Do you need a lead investor?"
          value={values.leadNeeded}
          options={LEAD_NEED_OPTIONS}
          required
          onChange={(value) => onChange("leadNeeded", value)}
        />
      </div>
    </fieldset>
  );
}

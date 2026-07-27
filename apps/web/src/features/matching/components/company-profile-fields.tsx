"use client";

import { Building2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/features/matching/components/structured-intake-controls";
import {
  HQ_COUNTRY_OPTIONS,
  PRIMARY_MARKET_OPTIONS,
  type StructuredIntakeValues,
} from "@/features/matching/types/structured-intake";

export function CompanyProfileFields({
  values,
  disabled,
  onChange,
}: {
  values: StructuredIntakeValues;
  disabled: boolean;
  onChange: (
    field:
      | "companyName"
      | "companySummary"
      | "hqCountry"
      | "otherHqCountry"
      | "primaryMarket"
      | "otherPrimaryMarket",
    value: string,
  ) => void;
}) {
  return (
    <fieldset
      className="grid gap-5 border-b border-border p-5 md:p-7"
      disabled={disabled}
    >
      <legend className="sr-only">Company profile</legend>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Company profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Core identity, location, and product summary.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <label
            htmlFor="company-name"
            className="text-sm font-semibold text-foreground"
          >
            Company name
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id="company-name"
            value={values.companyName}
            onChange={(event) => onChange("companyName", event.target.value)}
            placeholder="e.g. Acme AI"
            autoComplete="organization"
          />
        </div>

        <SelectField
          id="hq-country"
          label="HQ country"
          value={values.hqCountry}
          options={HQ_COUNTRY_OPTIONS}
          required
          onChange={(value) => onChange("hqCountry", value)}
        />

        {values.hqCountry === "other" ? (
          <div className="grid gap-2">
            <label
              htmlFor="other-hq-country"
              className="text-sm font-semibold text-foreground"
            >
              Other HQ country
              <span className="ml-1 text-destructive" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id="other-hq-country"
              value={values.otherHqCountry}
              onChange={(event) => onChange("otherHqCountry", event.target.value)}
              placeholder="Enter country"
            />
          </div>
        ) : null}

        <SelectField
          id="primary-market"
          label="Primary market"
          value={values.primaryMarket}
          options={PRIMARY_MARKET_OPTIONS}
          required
          onChange={(value) => onChange("primaryMarket", value)}
        />

        {values.primaryMarket === "other" ? (
          <div className="grid gap-2">
            <label
              htmlFor="other-primary-market"
              className="text-sm font-semibold text-foreground"
            >
              Other primary market
              <span className="ml-1 text-destructive" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id="other-primary-market"
              value={values.otherPrimaryMarket}
              onChange={(event) => onChange("otherPrimaryMarket", event.target.value)}
              placeholder="Enter market or region"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="company-summary"
          className="text-sm font-semibold text-foreground"
        >
          Product summary
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        </label>
        <Textarea
          id="company-summary"
          value={values.companySummary}
          onChange={(event) => onChange("companySummary", event.target.value)}
          placeholder="What does the company build, and who is it for?"
          className="min-h-24 resize-y"
        />
      </div>
    </fieldset>
  );
}

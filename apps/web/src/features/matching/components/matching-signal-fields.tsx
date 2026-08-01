"use client";

import { Target } from "lucide-react";

import {
  MultiSelectField,
  SelectField,
} from "@/features/matching/components/structured-intake-controls";
import {
  AI_RELEVANCE_OPTIONS,
  BUSINESS_MODEL_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  SALES_MOTION_OPTIONS,
  SECTOR_OPTIONS,
  TECHNOLOGY_DEPTH_OPTIONS,
  getDirectionOptions,
  type StructuredIntakeValues,
} from "@/features/matching/types/structured-intake";

export function MatchingSignalFields({
  values,
  disabled,
  onTextChange,
  onSectorsChange,
  onDirectionsChange,
}: {
  values: StructuredIntakeValues;
  disabled: boolean;
  onTextChange: (
    field:
      | "customerType"
      | "businessModel"
      | "salesMotion"
      | "technologyDepth"
      | "aiRelevance",
    value: string,
  ) => void;
  onSectorsChange: (values: string[]) => void;
  onDirectionsChange: (values: string[]) => void;
}) {
  const directionOptions = getDirectionOptions(values.sectors);

  return (
    <fieldset className="grid gap-5 p-5 md:p-7" disabled={disabled}>
      <legend className="sr-only">Matching signals</legend>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Target className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Matching signals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the plain-language options that best describe the company.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MultiSelectField
          label="Industry sectors"
          placeholder="Select sectors"
          options={SECTOR_OPTIONS}
          selected={values.sectors}
          maxSelected={2}
          required
          disabled={disabled}
          onChange={onSectorsChange}
        />

        <MultiSelectField
          label="Specific focus areas"
          placeholder="Select focus areas"
          options={directionOptions}
          selected={values.directions}
          maxSelected={3}
          disabled={disabled || values.sectors.length === 0}
          emptyMessage="Select a sector first"
          onChange={onDirectionsChange}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <SelectField
          id="customer-type"
          label="Primary customer"
          value={values.customerType}
          options={CUSTOMER_TYPE_OPTIONS}
          required
          onChange={(value) => onTextChange("customerType", value)}
        />
        <SelectField
          id="business-model"
          label="Business model"
          value={values.businessModel}
          options={BUSINESS_MODEL_OPTIONS}
          required
          onChange={(value) => onTextChange("businessModel", value)}
        />
        <SelectField
          id="sales-motion"
          label="How customers buy"
          value={values.salesMotion}
          options={SALES_MOTION_OPTIONS}
          placeholder="Optional"
          onChange={(value) => onTextChange("salesMotion", value)}
        />
        <SelectField
          id="technology-depth"
          label="Technology type"
          value={values.technologyDepth}
          options={TECHNOLOGY_DEPTH_OPTIONS}
          placeholder="Optional"
          onChange={(value) => onTextChange("technologyDepth", value)}
        />
        <SelectField
          id="ai-relevance"
          label="Role of AI"
          value={values.aiRelevance}
          options={AI_RELEVANCE_OPTIONS}
          placeholder="Optional"
          onChange={(value) => onTextChange("aiRelevance", value)}
        />
      </div>
    </fieldset>
  );
}

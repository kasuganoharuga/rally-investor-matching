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
    <fieldset
      className="grid gap-5 border-b border-border p-5 md:p-7"
      disabled={disabled}
    >
      <legend className="sr-only">Matching signals</legend>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Target className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Matching signals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the closest fit from the database taxonomy.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MultiSelectField
          label="Investment sectors"
          placeholder="Select sectors"
          options={SECTOR_OPTIONS}
          selected={values.sectors}
          maxSelected={3}
          required
          disabled={disabled}
          onChange={onSectorsChange}
        />

        <MultiSelectField
          label="Specific directions"
          placeholder="Select specific directions"
          options={directionOptions}
          selected={values.directions}
          maxSelected={5}
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
          label="Sales motion"
          value={values.salesMotion}
          options={SALES_MOTION_OPTIONS}
          placeholder="Optional"
          onChange={(value) => onTextChange("salesMotion", value)}
        />
        <SelectField
          id="technology-depth"
          label="Technology profile"
          value={values.technologyDepth}
          options={TECHNOLOGY_DEPTH_OPTIONS}
          placeholder="Optional"
          onChange={(value) => onTextChange("technologyDepth", value)}
        />
        <SelectField
          id="ai-relevance"
          label="AI relevance"
          value={values.aiRelevance}
          options={AI_RELEVANCE_OPTIONS}
          placeholder="Optional"
          onChange={(value) => onTextChange("aiRelevance", value)}
        />
      </div>
    </fieldset>
  );
}

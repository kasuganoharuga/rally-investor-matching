import { Pencil, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  labelsFor,
  ReviewBadgeItem,
  ReviewChipsItem,
} from "@/features/matching/components/structured-intake-review-items";
import {
  AI_RELEVANCE_OPTIONS,
  BUSINESS_MODEL_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  getDirectionOptions,
  getIntakeOptionLabel,
  SALES_MOTION_OPTIONS,
  SECTOR_OPTIONS,
  TECHNOLOGY_DEPTH_OPTIONS,
  type StructuredIntakeValues,
} from "@/features/matching/types/structured-intake";

export function StructuredIntakeReviewSignals({
  values,
  onEdit,
}: {
  values: StructuredIntakeValues;
  onEdit: () => void;
}) {
  const directionOptions = getDirectionOptions(values.sectors);

  return (
    <section className="p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Target className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">Investor fit</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The selected signals used to rank eligible investors.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Edit investor fit"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Edit
        </Button>
      </div>
      <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <ReviewChipsItem
          label="Industry sectors"
          values={labelsFor(SECTOR_OPTIONS, values.sectors)}
          wide
        />
        <ReviewChipsItem
          label="Specific focus areas"
          values={labelsFor(directionOptions, values.directions)}
          wide
        />
        <ReviewChipsItem
          label="Primary customer"
          values={labelsFor(CUSTOMER_TYPE_OPTIONS, values.customerTypes)}
        />
        <ReviewChipsItem
          label="Business model"
          values={labelsFor(BUSINESS_MODEL_OPTIONS, values.businessModels)}
        />
        <ReviewBadgeItem
          label="How customers buy"
          value={
            values.salesMotion
              ? getIntakeOptionLabel(SALES_MOTION_OPTIONS, values.salesMotion)
              : ""
          }
        />
        <ReviewBadgeItem
          label="Technology type"
          value={
            values.technologyDepth
              ? getIntakeOptionLabel(TECHNOLOGY_DEPTH_OPTIONS, values.technologyDepth)
              : ""
          }
        />
        <ReviewBadgeItem
          label="Role of AI"
          value={
            values.aiRelevance
              ? getIntakeOptionLabel(AI_RELEVANCE_OPTIONS, values.aiRelevance)
              : ""
          }
        />
      </dl>
    </section>
  );
}

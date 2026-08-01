import { Building2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ReviewBadgeItem,
  ReviewItem,
} from "@/features/matching/components/structured-intake-review-items";
import {
  getIntakeOptionLabel,
  HQ_COUNTRY_OPTIONS,
  LEAD_NEED_OPTIONS,
  PRIMARY_MARKET_OPTIONS,
  STAGE_OPTIONS,
  type StructuredIntakeValues,
} from "@/features/matching/types/structured-intake";

export function StructuredIntakeReviewCompany({
  values,
  onEdit,
}: {
  values: StructuredIntakeValues;
  onEdit: () => void;
}) {
  const hqCountry =
    values.hqCountry === "other"
      ? values.otherHqCountry
      : getIntakeOptionLabel(HQ_COUNTRY_OPTIONS, values.hqCountry);
  const primaryMarket =
    values.primaryMarket === "other"
      ? values.otherPrimaryMarket
      : getIntakeOptionLabel(PRIMARY_MARKET_OPTIONS, values.primaryMarket);
  const amount = Number(values.raiseAmount);
  const formattedAmount = Number.isFinite(amount)
    ? new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(amount)
    : values.raiseAmount;

  return (
    <section className="p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Company and round
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The company details investors will be matched against.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Edit company and round"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Edit
        </Button>
      </div>
      <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <ReviewItem label="Company" value={values.companyName} />
        <ReviewItem label="HQ country" value={hqCountry} />
        <ReviewItem label="Primary market" value={primaryMarket} />
        <ReviewBadgeItem
          label="Funding stage"
          value={getIntakeOptionLabel(STAGE_OPTIONS, values.stage)}
        />
        <ReviewItem
          label="Target raise"
          value={values.raiseAmount ? `${values.raiseCurrency} ${formattedAmount}` : ""}
          emphasize
        />
        <ReviewBadgeItem
          label="Lead requirement"
          value={getIntakeOptionLabel(LEAD_NEED_OPTIONS, values.leadNeeded)}
        />
        {values.companySummary.trim() ? (
          <ReviewItem
            label="Additional company context"
            value={values.companySummary}
            wide
          />
        ) : null}
      </dl>
    </section>
  );
}

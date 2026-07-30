import { Building2, Pencil, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AI_RELEVANCE_OPTIONS,
  BUSINESS_MODEL_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  getDirectionOptions,
  getIntakeOptionLabel,
  HQ_COUNTRY_OPTIONS,
  LEAD_NEED_OPTIONS,
  PRIMARY_MARKET_OPTIONS,
  SALES_MOTION_OPTIONS,
  SECTOR_OPTIONS,
  STAGE_OPTIONS,
  TECHNOLOGY_DEPTH_OPTIONS,
  type IntakeOption,
  type StructuredIntakeValues,
} from "@/features/matching/types/structured-intake";

function labelsFor(options: IntakeOption[], values: string[]): string {
  return values.map((value) => getIntakeOptionLabel(options, value)).join(", ");
}

function ReviewItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium leading-6 text-foreground">
        {value || "Not specified"}
      </dd>
    </div>
  );
}

export function StructuredIntakeReview({
  values,
  onEditCompany,
  onEditSignals,
}: {
  values: StructuredIntakeValues;
  onEditCompany: () => void;
  onEditSignals: () => void;
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
  const directionOptions = getDirectionOptions(values.sectors);

  return (
    <div className="divide-y divide-border">
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
            onClick={onEditCompany}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Button>
        </div>
        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <ReviewItem label="Company" value={values.companyName} />
          <ReviewItem label="HQ country" value={hqCountry} />
          <ReviewItem label="Primary market" value={primaryMarket} />
          <ReviewItem
            label="Funding stage"
            value={getIntakeOptionLabel(STAGE_OPTIONS, values.stage)}
          />
          <ReviewItem
            label="Target raise"
            value={`${values.raiseCurrency} ${formattedAmount}`}
          />
          <ReviewItem
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

      <section className="p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary/25 text-primary">
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
            onClick={onEditSignals}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Button>
        </div>
        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <ReviewItem
            label="Industry sectors"
            value={labelsFor(SECTOR_OPTIONS, values.sectors)}
          />
          <ReviewItem
            label="Specific focus areas"
            value={labelsFor(directionOptions, values.directions)}
          />
          <ReviewItem
            label="Primary customer"
            value={getIntakeOptionLabel(CUSTOMER_TYPE_OPTIONS, values.customerType)}
          />
          <ReviewItem
            label="Business model"
            value={getIntakeOptionLabel(BUSINESS_MODEL_OPTIONS, values.businessModel)}
          />
          <ReviewItem
            label="How customers buy"
            value={
              values.salesMotion
                ? getIntakeOptionLabel(SALES_MOTION_OPTIONS, values.salesMotion)
                : ""
            }
          />
          <ReviewItem
            label="Technology type"
            value={
              values.technologyDepth
                ? getIntakeOptionLabel(TECHNOLOGY_DEPTH_OPTIONS, values.technologyDepth)
                : ""
            }
          />
          <ReviewItem
            label="Role of AI"
            value={
              values.aiRelevance
                ? getIntakeOptionLabel(AI_RELEVANCE_OPTIONS, values.aiRelevance)
                : ""
            }
          />
        </dl>
      </section>
    </div>
  );
}

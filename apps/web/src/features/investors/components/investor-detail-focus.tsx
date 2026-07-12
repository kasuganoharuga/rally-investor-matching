import {
  chequeRangeLabel,
  dealsTrackedSummary,
  titleCase,
} from "@/features/investors/components/investor-detail-format";
import { TagGroup } from "@/features/investors/components/investor-detail-tag-group";
import type { InvestorDetail } from "@/features/investors/types/investor";

type InvestorDetailFocusProps = {
  investor: InvestorDetail;
};

export function InvestorDetailFocus({ investor }: InvestorDetailFocusProps) {
  const { total, last24Months } = dealsTrackedSummary(investor.recentDeals);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-foreground">Investment focus</h2>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <TagGroup label="Stage focus" values={investor.stageFocus} />
        <TagGroup label="Sector focus" values={investor.sectorFocus} />
        <TagGroup label="Geography focus" values={investor.geographyFocus} />
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Lead behavior
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {titleCase(investor.leadBehavior)}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-dashed border-border pt-5">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Cheque ranges
        </p>
        {investor.chequeRanges.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {investor.chequeRanges.map((range, index) => (
              <div
                key={`${range.stage ?? "range"}-${index}`}
                className="rounded-lg bg-background px-3 py-2"
              >
                <p className="truncate text-xs text-muted-foreground">
                  {titleCase(String(range.stage ?? "Stage unknown"))}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {chequeRangeLabel(range)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No cheque ranges on this record yet.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-4 border-t border-dashed border-border pt-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            AI appetite
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {titleCase(investor.aiAppetite)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Deals tracked (last 24 months)
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {last24Months} of {total} tracked deals
          </p>
        </div>
      </div>
    </section>
  );
}

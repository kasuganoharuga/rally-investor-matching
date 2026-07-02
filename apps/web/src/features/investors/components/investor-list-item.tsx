import type { InvestorSummary } from "@/features/investors/types/investor";

type InvestorListItemProps = {
  investor: InvestorSummary;
};

export function InvestorListItem({ investor }: InvestorListItemProps) {
  return (
    <article className="rounded-lg border border-border bg-background p-4 text-foreground">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{investor.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {[investor.investorType, investor.hqCountry].filter(Boolean).join(" / ") ||
              "Details pending"}
          </p>
        </div>
        <span className="rounded-lg bg-muted px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
          {investor.screeningStatus}
        </span>
      </div>
      {investor.stageFocus.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Stage focus: {investor.stageFocus.join(", ")}
        </p>
      ) : null}
    </article>
  );
}

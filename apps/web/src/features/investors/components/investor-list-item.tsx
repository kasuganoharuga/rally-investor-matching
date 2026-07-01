import type { InvestorSummary } from "@/features/investors/types/investor";

type InvestorListItemProps = {
  investor: InvestorSummary;
};

export function InvestorListItem({ investor }: InvestorListItemProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{investor.name}</h3>
          <p className="mt-1 text-sm text-white/65">
            {[investor.investorType, investor.hqCountry].filter(Boolean).join(" · ") ||
              "Details pending"}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
          {investor.screeningStatus}
        </span>
      </div>
      {investor.stageFocus.length > 0 ? (
        <p className="mt-4 text-sm text-white/75">
          Stage focus: {investor.stageFocus.join(", ")}
        </p>
      ) : null}
    </article>
  );
}

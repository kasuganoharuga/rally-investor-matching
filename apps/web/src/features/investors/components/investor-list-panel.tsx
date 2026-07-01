"use client";

import { InvestorListItem } from "@/features/investors/components/investor-list-item";
import {
  InvestorListEmpty,
  InvestorListError,
  InvestorListLoading,
} from "@/features/investors/components/investor-list-states";
import { useInvestorList } from "@/features/investors/hooks/use-investor-list";

export function InvestorListPanel() {
  const { items, isLoading, error, reload } = useInvestorList();

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-secondary">
          Reference Feature
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Investor directory</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Client hook, feature API module, route handler, server service, and repository
          scaffold.
        </p>
      </div>

      {isLoading ? <InvestorListLoading /> : null}
      {!isLoading && error ? (
        <InvestorListError message={error.message} onRetry={reload} />
      ) : null}
      {!isLoading && !error && items.length === 0 ? <InvestorListEmpty /> : null}
      {!isLoading && !error && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((investor) => (
            <InvestorListItem key={investor.id} investor={investor} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

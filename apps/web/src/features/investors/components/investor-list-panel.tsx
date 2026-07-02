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
    <aside className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">Investors</p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">Database</h2>
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
    </aside>
  );
}

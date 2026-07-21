"use client";

import { useState } from "react";

import { InvestorManagementListRow } from "@/features/investor-management/components/investor-management-list-row";
import type { ManagedInvestor } from "@/features/investor-management/types/investor-management";

const PAGE_SIZE = 40;

export function InvestorManagementList({
  items,
  selectedId,
  onSelect,
}: {
  items: ManagedInvestor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleItems = items.slice(0, visibleCount);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-14 text-center">
        <p className="font-semibold">No investors match these filters</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a broader search or review status.
        </p>
      </div>
    );
  }

  return (
    <section
      className="order-2 min-w-0 overflow-hidden rounded-lg border bg-card shadow-sm lg:order-1"
      aria-label="Investor review queue"
    >
      {visibleItems.map((investor) => (
        <InvestorManagementListRow
          key={investor.id}
          investor={investor}
          selected={selectedId === investor.id}
          onSelect={() => onSelect(investor.id)}
        />
      ))}
      {visibleCount < items.length ? (
        <div className="border-t p-3 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="rounded-md border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Show more ({items.length - visibleCount} remaining)
          </button>
        </div>
      ) : null}
    </section>
  );
}

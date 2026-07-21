"use client";

import { useMemo, useState } from "react";

import { InvestorManagementDetail } from "@/features/investor-management/components/investor-management-detail";
import { filterManagedInvestors } from "@/features/investor-management/components/investor-management-filter";
import { InvestorManagementList } from "@/features/investor-management/components/investor-management-list";
import {
  InvestorManagementEmpty,
  InvestorManagementError,
  InvestorManagementLoading,
} from "@/features/investor-management/components/investor-management-states";
import { InvestorManagementStats } from "@/features/investor-management/components/investor-management-stats";
import {
  InvestorManagementToolbar,
  type InvestorQualityFilter,
  type InvestorReviewFilter,
  type InvestorSort,
} from "@/features/investor-management/components/investor-management-toolbar";
import { useInvestorManagement } from "@/features/investor-management/hooks/use-investor-management";

export function InvestorManagementPanel() {
  const {
    items,
    isLoading,
    error,
    reload,
    review: saveReview,
  } = useInvestorManagement();
  const [query, setQuery] = useState("");
  const [review, setReview] = useState<InvestorReviewFilter>("queue");
  const [quality, setQuality] = useState<InvestorQualityFilter>("all");
  const [sort, setSort] = useState<InvestorSort>("review-priority");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredItems = useMemo(
    () => filterManagedInvestors(items, query, review, quality, sort),
    [items, quality, query, review, sort],
  );

  const selectedInvestor =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Management
        </p>
        <h1 className="mt-1 text-3xl font-semibold">Manage Investors</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Review investor evidence, resolve data gaps, and approve records used for
          founder matching.
        </p>
      </div>
      {isLoading ? <InvestorManagementLoading /> : null}
      {!isLoading && error ? (
        <InvestorManagementError
          message={error.message}
          onRetry={() => void reload()}
        />
      ) : null}
      {!isLoading && !error && items.length === 0 ? <InvestorManagementEmpty /> : null}
      {!isLoading && !error && items.length > 0 ? (
        <>
          <InvestorManagementStats items={items} />
          <InvestorManagementToolbar
            query={query}
            review={review}
            quality={quality}
            sort={sort}
            resultCount={filteredItems.length}
            onQueryChange={setQuery}
            onReviewChange={setReview}
            onQualityChange={setQuality}
            onSortChange={setSort}
          />
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.8fr)] lg:items-start">
            <InvestorManagementList
              items={filteredItems}
              selectedId={selectedInvestor?.id ?? null}
              onSelect={(id) => {
                setSelectedId(id);
                if (window.matchMedia("(max-width: 1023px)").matches) {
                  requestAnimationFrame(() =>
                    document
                      .getElementById("investor-review-detail")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  );
                }
              }}
            />
            <InvestorManagementDetail
              investor={selectedInvestor}
              onReview={saveReview}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

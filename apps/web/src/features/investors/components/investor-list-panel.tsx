"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Lock, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { InvestorListItem } from "@/features/investors/components/investor-list-item";
import {
  InvestorListEmpty,
  InvestorListError,
  InvestorListLoading,
} from "@/features/investors/components/investor-list-states";
import { useInvestorList } from "@/features/investors/hooks/use-investor-list";
import { useShortlist } from "@/features/shortlist/hooks/use-shortlist";
import type { InvestorSummary } from "@/features/investors/types/investor";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterKey = "stage" | "sector" | "geography";

const FILTER_LABELS: Record<FilterKey, string> = {
  stage: "Stage",
  sector: "Sector",
  geography: "Geography",
};

function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function optionsFrom(items: InvestorSummary[], key: FilterKey): string[] {
  const values = new Set<string>();
  for (const item of items) {
    const source =
      key === "stage"
        ? item.stageFocus
        : key === "sector"
          ? item.sectorFocus
          : item.geographyFocus;
    for (const value of source) {
      if (value) {
        values.add(value);
      }
    }
  }
  return Array.from(values).sort((a, b) => titleCase(a).localeCompare(titleCase(b)));
}

function matchesFilter(item: InvestorSummary, key: FilterKey, value: string): boolean {
  if (!value) {
    return true;
  }
  const source =
    key === "stage"
      ? item.stageFocus
      : key === "sector"
        ? item.sectorFocus
        : item.geographyFocus;
  return source.includes(value);
}

function filterItems(
  items: InvestorSummary[],
  query: string,
  filters: Record<FilterKey, string>,
) {
  const normalizedQuery = query.trim().toLowerCase();
  return items.filter((item) => {
    const text = [
      item.name,
      item.investorType,
      item.hqCity,
      item.hqState,
      item.hqCountry,
      ...item.stageFocus,
      ...item.sectorFocus,
      ...item.geographyFocus,
      ...item.businessModelFocus,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!normalizedQuery || text.includes(normalizedQuery)) &&
      matchesFilter(item, "stage", filters.stage) &&
      matchesFilter(item, "sector", filters.sector) &&
      matchesFilter(item, "geography", filters.geography)
    );
  });
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-28 appearance-none rounded-full border border-border bg-card px-4 pr-8 text-sm font-medium text-foreground shadow-sm outline-none transition hover:border-primary/40 focus:border-primary"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </label>
  );
}

export function InvestorListPanel() {
  const { items, isLoading, error, reload } = useInvestorList();
  const shortlist = useShortlist();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    stage: "",
    sector: "",
    geography: "",
  });

  const filterOptions = useMemo(
    () => ({
      stage: optionsFrom(items, "stage"),
      sector: optionsFrom(items, "sector"),
      geography: optionsFrom(items, "geography"),
    }),
    [items],
  );

  const filteredItems = useMemo(
    () => filterItems(items, query, filters),
    [filters, items, query],
  );

  function updateFilter(key: FilterKey, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Investor directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse Rally&apos;s reviewed ANZ investors.
          </p>
        </div>
        <Link
          href="/match"
          className={cn(
            buttonVariants({ size: "lg" }),
            "bg-secondary text-secondary-foreground hover:bg-secondary/90",
          )}
        >
          Match me to these
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search investor name</span>
          <Search
            className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search investor name..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-11 pr-4 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
            <FilterSelect
              key={key}
              label={FILTER_LABELS[key]}
              value={filters[key]}
              options={filterOptions[key]}
              onChange={(value) => updateFilter(key, value)}
            />
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredItems.length} of {items.length} reviewed investors
      </p>
      {shortlist.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {shortlist.error.message}
        </p>
      ) : null}

      {isLoading ? <InvestorListLoading /> : null}
      {!isLoading && error ? (
        <InvestorListError message={error.message} onRetry={reload} />
      ) : null}
      {!isLoading && !error && filteredItems.length === 0 ? (
        <InvestorListEmpty />
      ) : null}
      {!isLoading && !error && filteredItems.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredItems.map((investor) => (
            <InvestorListItem
              key={investor.id}
              investor={investor}
              isShortlisted={shortlist.isShortlisted(investor.id)}
              isShortlistPending={shortlist.isPending(investor.id)}
              onToggleShortlist={shortlist.toggle}
            />
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Lock className="size-4" aria-hidden="true" />
          Recommended contacts and warm-intro paths appear on your match results.
        </p>
      </div>
    </section>
  );
}

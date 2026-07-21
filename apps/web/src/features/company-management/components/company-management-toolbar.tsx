import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { ManagedCompanyStatus } from "@/features/company-management/types/company-management";

export type CompanyStatusFilter = "all" | ManagedCompanyStatus;
export type CompanySort = "updated" | "name" | "completion";

export function CompanyManagementToolbar({
  query,
  status,
  sort,
  resultCount,
  onQueryChange,
  onStatusChange,
  onSortChange,
}: {
  query: string;
  status: CompanyStatusFilter;
  sort: CompanySort;
  resultCount: number;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: CompanyStatusFilter) => void;
  onSortChange: (value: CompanySort) => void;
}) {
  return (
    <section className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search company, founder, email, or sector..."
          aria-label="Search companies"
          className="h-10 pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as CompanyStatusFilter)
          }
          aria-label="Filter by readiness"
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          <option value="all">All statuses</option>
          <option value="ready">Ready to match</option>
          <option value="needs-details">Needs details</option>
          <option value="no-match-profile">No matching profile</option>
        </select>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as CompanySort)}
          aria-label="Sort companies"
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        >
          <option value="updated">Recently updated</option>
          <option value="name">Company name</option>
          <option value="completion">Profile completion</option>
        </select>
        <span className="min-w-20 text-right text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? "company" : "companies"}
        </span>
      </div>
    </section>
  );
}

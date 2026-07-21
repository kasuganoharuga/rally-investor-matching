import { Search } from "lucide-react";

export type InvestorReviewFilter =
  "queue" | "all" | "unreviewed" | "needs_more_data" | "reviewed" | "rejected";
export type InvestorQualityFilter = "all" | "high" | "medium" | "low";
export type InvestorSort = "review-priority" | "name" | "confidence" | "deals";

type Props = {
  query: string;
  review: InvestorReviewFilter;
  quality: InvestorQualityFilter;
  sort: InvestorSort;
  resultCount: number;
  onQueryChange: (value: string) => void;
  onReviewChange: (value: InvestorReviewFilter) => void;
  onQualityChange: (value: InvestorQualityFilter) => void;
  onSortChange: (value: InvestorSort) => void;
};

export function InvestorManagementToolbar(props: Props) {
  return (
    <div className="grid min-w-0 gap-3 rounded-lg border bg-card p-3 shadow-sm lg:grid-cols-[minmax(240px,1fr)_180px_150px_180px_auto]">
      <label className="relative min-w-0">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          aria-label="Search investors"
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="Search investor, location, stage, or sector..."
          className="h-10 w-full rounded-md border bg-background pr-3 pl-9 text-sm outline-none focus:border-primary"
        />
      </label>
      <select
        aria-label="Filter by review status"
        value={props.review}
        onChange={(event) =>
          props.onReviewChange(event.target.value as InvestorReviewFilter)
        }
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="queue">Review queue</option>
        <option value="all">All statuses</option>
        <option value="unreviewed">Needs review</option>
        <option value="needs_more_data">Needs more data</option>
        <option value="reviewed">Reviewed</option>
        <option value="rejected">Rejected</option>
      </select>
      <select
        aria-label="Filter by data quality"
        value={props.quality}
        onChange={(event) =>
          props.onQualityChange(event.target.value as InvestorQualityFilter)
        }
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="all">All quality</option>
        <option value="high">High quality</option>
        <option value="medium">Medium quality</option>
        <option value="low">Low quality</option>
      </select>
      <select
        aria-label="Sort investors"
        value={props.sort}
        onChange={(event) => props.onSortChange(event.target.value as InvestorSort)}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="review-priority">Review priority</option>
        <option value="confidence">Evidence confidence</option>
        <option value="deals">Deals used</option>
        <option value="name">Investor name</option>
      </select>
      <p className="self-center whitespace-nowrap px-1 text-sm text-muted-foreground">
        {props.resultCount} {props.resultCount === 1 ? "investor" : "investors"}
      </p>
    </div>
  );
}

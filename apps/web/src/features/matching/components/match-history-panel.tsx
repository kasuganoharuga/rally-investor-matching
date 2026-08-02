import { History } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { MatchHistoryRecordCard } from "@/features/matching/components/match-history-record-card";
import type { MatchRecord } from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

type MatchHistoryPanelProps = {
  records: MatchRecord[];
};

function MatchHistoryEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
        <History className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">
        No matching records yet
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
        Every match you run is saved here, so you can revisit the investor list and
        evidence behind it later.
      </p>
      <Link href="/match" className={cn(buttonVariants({ size: "lg" }), "mt-5")}>
        Run your first match
      </Link>
    </div>
  );
}

export function MatchHistoryPanel({ records }: MatchHistoryPanelProps) {
  if (records.length === 0) {
    return <MatchHistoryEmptyState />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary pb-3">
        <p className="text-sm font-semibold text-foreground">
          Matching records
          <span className="ml-1 font-normal text-muted-foreground">
            ({records.length})
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Sorted by: <span className="font-semibold text-foreground">Most recent</span>
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {records.map((record) => (
          <MatchHistoryRecordCard key={record.id} record={record} />
        ))}
      </div>
    </div>
  );
}

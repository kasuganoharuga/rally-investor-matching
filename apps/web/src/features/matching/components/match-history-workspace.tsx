"use client";

import { MatchHistoryScreen } from "@/features/matching/components/match-history-screen";
import { WorkspaceSubnav } from "@/features/matching/components/workspace-subnav";
import { useMatchHistoryList } from "@/features/matching/hooks/use-match-history-list";

const HISTORY_CONTAINER = "mx-auto w-full max-w-6xl px-5 py-8 md:px-7 md:py-10";

function MatchHistoryLoading() {
  return (
    <section className={`${HISTORY_CONTAINER} space-y-4`}>
      <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />
      <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
    </section>
  );
}

export function MatchHistoryWorkspace() {
  const { records, isLoading, error } = useMatchHistoryList();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceSubnav recordCount={records.length} />
      {isLoading ? (
        <MatchHistoryLoading />
      ) : error ? (
        <section className={HISTORY_CONTAINER}>
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error.message}
          </div>
        </section>
      ) : (
        <MatchHistoryScreen records={records} />
      )}
    </div>
  );
}

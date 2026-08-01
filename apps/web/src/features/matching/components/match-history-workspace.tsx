"use client";

import { MatchHistoryScreen } from "@/features/matching/components/match-history-screen";
import { WorkspaceSubnav } from "@/features/matching/components/workspace-subnav";
import { useMatchHistoryList } from "@/features/matching/hooks/use-match-history-list";

export function MatchHistoryWorkspace() {
  const { records, isLoading, error } = useMatchHistoryList();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceSubnav recordCount={records.length} />
      {isLoading ? (
        <section className="mx-auto w-full max-w-5xl px-6 py-6">
          <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
        </section>
      ) : error ? (
        <section className="mx-auto w-full max-w-5xl px-6 py-6">
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

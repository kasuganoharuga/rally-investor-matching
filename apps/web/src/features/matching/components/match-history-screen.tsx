import { Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatRecordDate } from "@/features/matching/components/match-display";
import { MatchHistoryPanel } from "@/features/matching/components/match-history-panel";
import { summarizeHistory } from "@/features/matching/components/match-history-summary";
import type { MatchRecord } from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-muted-foreground/70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function MatchHistoryScreen({ records }: { records: MatchRecord[] }) {
  const summary = summarizeHistory(records);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 md:px-7 md:py-10">
      <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Match history</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every match run saved to your account, with the investor list and evidence
              behind it.
            </p>
          </div>
          <Link href="/match" className={cn(buttonVariants({ size: "lg" }))}>
            <Plus className="size-4" aria-hidden="true" />
            New match
          </Link>
        </div>

        {records.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
            <HistoryStat label="Match runs" value={String(summary.runCount)} />
            <HistoryStat
              label="Investors surfaced"
              value={String(summary.matchCount)}
            />
            <HistoryStat label="Strong fits" value={String(summary.strongCount)} />
            <HistoryStat
              label="Last run"
              value={summary.lastRunAt ? formatRecordDate(summary.lastRunAt) : "—"}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <MatchHistoryPanel records={records} />
      </div>
    </section>
  );
}

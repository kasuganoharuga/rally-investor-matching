import { AlertTriangle } from "lucide-react";

import type { MatchResult } from "@/features/matching/types/match";

export function MatchDetailWatchOuts({ match }: { match: MatchResult }) {
  const risks =
    match.risks.length > 0
      ? match.risks.slice(0, 3)
      : ["Review cheque size and current lead behaviour before outreach."];

  return (
    <section className="rounded-lg border border-warning/30 bg-warning/10 p-5 text-foreground">
      <div className="flex items-center gap-2 text-warning">
        <AlertTriangle className="size-4" aria-hidden="true" />
        <h2 className="font-semibold">Watch-outs before you reach out</h2>
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {risks.map((risk) => (
          <li key={risk} className="flex gap-2">
            <span className="mt-2 size-1.5 rounded-full bg-warning" />
            <span>{risk}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

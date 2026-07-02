import { formatRecordDate } from "./match-display";
import type { MatchRecord } from "@/features/matching/hooks/use-match-intake";

type MatchHistoryPanelProps = {
  records: MatchRecord[];
};

export function MatchHistoryPanel({ records }: MatchHistoryPanelProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        Matching records
      </p>
      {records.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          No matching records yet.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {records.slice(0, 4).map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {record.response.parsed_company_profile.company_name
                    ? String(record.response.parsed_company_profile.company_name)
                    : "Founder match"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRecordDate(record.createdAt)}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {record.response.matches.length} matches
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

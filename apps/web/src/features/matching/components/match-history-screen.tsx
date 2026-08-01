import { Button } from "@/components/ui/button";
import { MatchHistoryPanel } from "@/features/matching/components/match-history-panel";
import type { MatchRecord } from "@/features/matching/hooks/use-match-intake";

export function MatchHistoryScreen({
  records,
  onBackToNewMatch,
  onSelectRecord,
}: {
  records: MatchRecord[];
  onBackToNewMatch: () => void;
  onSelectRecord: (record: MatchRecord) => void;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Match history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent matches saved to your account.
          </p>
        </div>
        <Button type="button" onClick={onBackToNewMatch}>
          New match
        </Button>
      </div>
      <MatchHistoryPanel records={records} onSelectRecord={onSelectRecord} />
    </section>
  );
}

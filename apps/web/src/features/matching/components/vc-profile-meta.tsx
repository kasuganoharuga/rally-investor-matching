export function ProfileMetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase text-muted-foreground/70">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function numericProfileValue(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function formatProfileUpdated(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(parsed);
}

/**
 * Flat grid, no vertical rules. An earlier version drew `border-l` with
 * `first:border-l-0`, which only clears the first cell of the whole list —
 * every wrapped row then started with a dangling rule.
 */
export function VcProfileMetaGrid({
  reviewedDeals,
  leadRatio,
  coreStageLabel,
  updatedAt,
}: {
  reviewedDeals: string;
  leadRatio: number | null;
  coreStageLabel?: string | null;
  updatedAt: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-border bg-card px-5 py-4 shadow-sm sm:grid-cols-4">
      <ProfileMetaStat label="Reviewed deals" value={reviewedDeals} />
      <ProfileMetaStat
        label="Lead rate"
        value={leadRatio === null ? "Unknown" : `${Math.round(leadRatio * 100)}%`}
      />
      <ProfileMetaStat label="Core stage" value={coreStageLabel ?? "Not observed"} />
      <ProfileMetaStat label="Updated" value={formatProfileUpdated(updatedAt)} />
    </div>
  );
}

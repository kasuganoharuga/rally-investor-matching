import { cn } from "@/lib/utils";

export function ProfileTag({
  children,
  accent = false,
  className,
}: {
  children: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "max-w-full rounded-full border px-2.5 py-1 text-xs leading-5 font-medium break-words whitespace-normal",
        accent
          ? "border-secondary bg-secondary/30 text-primary"
          : "border-border bg-background text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProfileMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="min-w-0 border-l border-border px-5 first:border-l-0 first:pl-0">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold break-words text-foreground">{value}</p>
      {note ? (
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{note}</p>
      ) : null}
    </div>
  );
}

export function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}

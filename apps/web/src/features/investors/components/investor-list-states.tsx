import { Button } from "@/components/ui/button";

type InvestorListErrorProps = {
  message: string;
  onRetry: () => void;
};

export function InvestorListError({ message, onRetry }: InvestorListErrorProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
      <p className="text-sm font-medium text-destructive">Unable to load investors</p>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-4"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

function InvestorListItemSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="size-11 shrink-0 rounded-lg bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3 border-t border-border pt-4">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
        <div className="h-6 w-20 rounded-full bg-muted" />
      </div>
      <div className="mt-4 min-h-10 space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
      </div>
      <div className="mt-auto flex gap-2 pt-4">
        <div className="h-9 flex-1 rounded-lg bg-muted" />
        <div className="size-9 rounded-lg bg-muted" />
        <div className="size-9 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

/** Mirrors the real grid so the loading state doesn't jump when data arrives. */
export function InvestorListLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <InvestorListItemSkeleton key={index} />
      ))}
    </div>
  );
}

export function InvestorListEmpty() {
  return (
    <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
      No investors found yet.
    </div>
  );
}

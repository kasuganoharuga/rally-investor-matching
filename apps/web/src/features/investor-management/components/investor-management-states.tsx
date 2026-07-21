import { AlertCircle, Database, Loader2 } from "lucide-react";

export function InvestorManagementLoading() {
  return (
    <div className="flex min-h-72 items-center justify-center rounded-lg border bg-card">
      <div className="text-center">
        <Loader2 className="mx-auto size-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading review queue...</p>
      </div>
    </div>
  );
}

export function InvestorManagementError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertCircle className="mx-auto size-6 text-destructive" />
      <p className="mt-3 font-semibold">Unable to load investors</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md border bg-background px-4 py-2 text-sm font-semibold"
      >
        Retry
      </button>
    </div>
  );
}

export function InvestorManagementEmpty() {
  return (
    <div className="rounded-lg border border-dashed bg-card p-12 text-center">
      <Database className="mx-auto size-7 text-muted-foreground" />
      <p className="mt-3 font-semibold">No investor records found</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Imported investors will appear here for review.
      </p>
    </div>
  );
}

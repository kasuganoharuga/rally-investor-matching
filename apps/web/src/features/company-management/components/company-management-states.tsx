import { Building2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CompanyManagementLoading() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
      <div className="h-[430px] animate-pulse rounded-lg border border-border bg-card" />
      <div className="h-[430px] animate-pulse rounded-lg border border-border bg-card" />
    </div>
  );
}

export function CompanyManagementError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <p className="font-semibold text-destructive">Unable to load companies</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-4" variant="outline" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

export function CompanyManagementEmpty() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
      <Building2 className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        No company profiles yet
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Founder companies will appear here after they complete their company profile.
      </p>
    </div>
  );
}

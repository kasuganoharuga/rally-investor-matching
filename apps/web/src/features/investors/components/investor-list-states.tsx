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

export function InvestorListLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-lg border border-border bg-background"
        />
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

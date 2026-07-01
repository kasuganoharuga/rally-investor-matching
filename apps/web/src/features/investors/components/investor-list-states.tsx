import { Button } from "@/components/ui/button";

type InvestorListErrorProps = {
  message: string;
  onRetry: () => void;
};

export function InvestorListError({ message, onRetry }: InvestorListErrorProps) {
  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-950/40 p-6 text-white">
      <p className="text-sm font-medium text-red-100">Unable to load investors</p>
      <p className="mt-2 text-sm text-white/70">{message}</p>
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
          className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5"
        />
      ))}
    </div>
  );
}

export function InvestorListEmpty() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
      No investors found yet.
    </div>
  );
}

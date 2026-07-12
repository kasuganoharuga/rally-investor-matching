import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InvestorDetailErrorProps = {
  message: string;
  onRetry: () => void;
};

export function InvestorDetailError({ message, onRetry }: InvestorDetailErrorProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
      <p className="text-sm font-medium text-destructive">Unable to load investor</p>
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

export function InvestorDetailLoading() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-lg border border-border bg-background" />
      <div className="h-64 animate-pulse rounded-lg border border-border bg-background" />
    </div>
  );
}

export function InvestorDetailNotFound() {
  return (
    <div className="rounded-lg border border-border bg-background p-6 text-center">
      <p className="text-sm font-medium text-foreground">Investor not found</p>
      <p className="mt-2 text-sm text-muted-foreground">
        This investor may have been removed or the link is out of date.
      </p>
      <Link href="/investors" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
        Back to directory
      </Link>
    </div>
  );
}

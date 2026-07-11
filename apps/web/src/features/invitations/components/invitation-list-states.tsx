import { Button } from "@/components/ui/button";

type InvitationListErrorProps = {
  message: string;
  onRetry: () => void;
};

export function InvitationListError({ message, onRetry }: InvitationListErrorProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
      <p className="text-sm font-medium text-destructive">Unable to load invitations</p>
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

export function InvitationListLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-lg border border-border bg-background"
        />
      ))}
    </div>
  );
}

export function InvitationListEmpty() {
  return (
    <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
      No invitations sent yet.
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { InvitationStatus } from "@/features/invitations/types/invitation";

const STATUS_STYLES: Record<InvitationStatus, string> = {
  pending: "bg-primary/10 text-primary",
  accepted: "bg-secondary text-secondary-foreground",
  expired: "bg-muted text-muted-foreground",
  revoked: "bg-destructive/10 text-destructive",
};

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

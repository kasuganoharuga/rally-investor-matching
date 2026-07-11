"use client";

import { Button } from "@/components/ui/button";
import { InvitationStatusBadge } from "@/features/invitations/components/invitation-status-badge";
import type { InvitationSummary } from "@/features/invitations/types/invitation";

type InvitationListItemProps = {
  invitation: InvitationSummary;
  isRevoking: boolean;
  onRevoke: (id: string) => void;
};

export function InvitationListItem({
  invitation,
  isRevoking,
  onRevoke,
}: InvitationListItemProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{invitation.email}</p>
        <p className="text-xs text-muted-foreground capitalize">{invitation.role}</p>
      </div>
      <div className="flex items-center gap-3">
        <InvitationStatusBadge status={invitation.status} />
        {invitation.status === "pending" ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isRevoking}
            onClick={() => onRevoke(invitation.id)}
          >
            {isRevoking ? "Revoking..." : "Revoke"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

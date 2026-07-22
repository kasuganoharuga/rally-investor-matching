"use client";

import { InvitationListItem } from "@/features/invitations/components/invitation-list-item";
import {
  InvitationListEmpty,
  InvitationListError,
  InvitationListLoading,
} from "@/features/invitations/components/invitation-list-states";
import { InviteUserForm } from "@/features/invitations/components/invite-user-form";
import { useInvitationList } from "@/features/invitations/hooks/use-invitation-list";
import type { UserRole } from "@/features/auth/types/auth";

export function InvitationListPanel({ viewerRole }: { viewerRole: UserRole }) {
  const { items, isLoading, error, reload, create, revoke, revokingId } =
    useInvitationList();

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite founders, reviewers, or admins. They receive a secure email link and
          create their own password before signing in.
        </p>
      </div>

      <InviteUserForm viewerRole={viewerRole} onCreate={create} />

      {isLoading ? <InvitationListLoading /> : null}
      {!isLoading && error ? (
        <InvitationListError message={error.message} onRetry={reload} />
      ) : null}
      {!isLoading && !error && items.length === 0 ? <InvitationListEmpty /> : null}
      {!isLoading && !error && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((invitation) => (
            <InvitationListItem
              key={invitation.id}
              invitation={invitation}
              isRevoking={revokingId === invitation.id}
              onRevoke={(id) => void revoke(id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

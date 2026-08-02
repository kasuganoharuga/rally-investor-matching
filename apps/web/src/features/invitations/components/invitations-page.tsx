import { PageShell } from "@/components/page-shell";
import { requirePageRole } from "@/features/auth/server/page-guards";
import { InvitationListPanel } from "@/features/invitations/components/invitation-list-panel";

export async function InvitationsPage() {
  const user = await requirePageRole(["admin", "reviewer"], "/investors");

  return (
    <PageShell width="content" active="user-management" user={user}>
      <InvitationListPanel viewerRole={user.role} />
    </PageShell>
  );
}

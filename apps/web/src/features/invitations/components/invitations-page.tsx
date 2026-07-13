import { SiteHeader } from "@/components/site-header";
import { requirePageRole } from "@/features/auth/server/page-guards";
import { InvitationListPanel } from "@/features/invitations/components/invitation-list-panel";

export async function InvitationsPage() {
  const user = await requirePageRole(["admin", "reviewer"], "/investors");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="user-management" user={user} />

      <div className="mx-auto w-full max-w-[1000px] px-6 py-7">
        <InvitationListPanel viewerRole={user.role} />
      </div>
    </main>
  );
}

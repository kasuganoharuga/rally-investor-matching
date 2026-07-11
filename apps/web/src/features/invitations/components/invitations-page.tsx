import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/features/auth/server/session";
import { InvitationListPanel } from "@/features/invitations/components/invitation-list-panel";

export async function InvitationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  if (user.role !== "admin" && user.role !== "reviewer") {
    redirect("/investors");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="invitations" user={user} />

      <div className="mx-auto w-full max-w-[1000px] px-6 py-7">
        <InvitationListPanel viewerRole={user.role} />
      </div>
    </main>
  );
}

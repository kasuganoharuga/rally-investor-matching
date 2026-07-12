import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/features/auth/server/session";
import { CompanyProfilePanel } from "@/features/company-profile/components/company-profile-panel";

export async function CompanyProfilePage() {
  // A page redirect, not requireFounder(): that throws an ApiError meant
  // for API routes, which would surface here as an unhandled exception
  // instead of sending the visitor somewhere sensible.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  if (user.role !== "founder") {
    redirect("/investors");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="company-profile" user={user} />

      <div className="mx-auto w-full max-w-[720px] px-6 py-7">
        <CompanyProfilePanel />
      </div>
    </main>
  );
}

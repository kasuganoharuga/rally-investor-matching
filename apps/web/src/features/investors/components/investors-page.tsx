import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/features/auth/server/session";
import { InvestorListPanel } from "@/features/investors/components/investor-list-panel";

export async function InvestorsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="investors" user={user} />

      <div className="mx-auto w-full max-w-[1440px] px-6 py-7">
        <InvestorListPanel />
      </div>
    </main>
  );
}

import { SiteHeader } from "@/components/site-header";
import { ComingSoonPanel } from "@/components/coming-soon-panel";
import { requirePageRole } from "@/features/auth/server/page-guards";

export async function InvestorManagementPage() {
  const user = await requirePageRole(["admin", "reviewer"], "/investors");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="manage-investors" user={user} />

      <div className="mx-auto w-full max-w-[1000px] px-6 py-7">
        <ComingSoonPanel
          title="Manage Investors"
          description="Review and edit the investor records used for founder matching."
          note="Investor record management is not available yet."
        />
      </div>
    </main>
  );
}

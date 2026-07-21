import { SiteHeader } from "@/components/site-header";
import { requirePageRole } from "@/features/auth/server/page-guards";
import { InvestorManagementPanel } from "@/features/investor-management/components/investor-management-panel";

export async function InvestorManagementPage() {
  const user = await requirePageRole(["admin", "reviewer"], "/investors");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="manage-investors" user={user} />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6">
        <InvestorManagementPanel />
      </div>
    </main>
  );
}

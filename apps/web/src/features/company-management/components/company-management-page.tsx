import { SiteHeader } from "@/components/site-header";
import { requirePageRole } from "@/features/auth/server/page-guards";
import { CompanyManagementPanel } from "@/features/company-management/components/company-management-panel";

export async function CompanyManagementPage() {
  const user = await requirePageRole(["admin", "reviewer"], "/investors");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="manage-companies" user={user} />

      <div className="mx-auto w-full max-w-[1440px] px-6 py-8">
        <CompanyManagementPanel />
      </div>
    </main>
  );
}

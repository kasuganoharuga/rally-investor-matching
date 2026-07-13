import { SiteHeader } from "@/components/site-header";
import { ComingSoonPanel } from "@/components/coming-soon-panel";
import { requirePageRole } from "@/features/auth/server/page-guards";

export async function CompanyManagementPage() {
  const user = await requirePageRole(["admin", "reviewer"], "/investors");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="manage-companies" user={user} />

      <div className="mx-auto w-full max-w-[1000px] px-6 py-7">
        <ComingSoonPanel
          title="Manage Companies"
          description="Review and edit founder company profiles across the platform."
          note="Company record management is not available yet."
        />
      </div>
    </main>
  );
}

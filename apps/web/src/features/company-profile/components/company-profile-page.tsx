import { SiteHeader } from "@/components/site-header";
import { requirePageRole } from "@/features/auth/server/page-guards";
import { CompanyProfilePanel } from "@/features/company-profile/components/company-profile-panel";

export async function CompanyProfilePage() {
  const user = await requirePageRole(["founder"], "/investors");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="company-profile" user={user} />

      <div className="mx-auto w-full max-w-[720px] px-6 py-7">
        <CompanyProfilePanel />
      </div>
    </main>
  );
}

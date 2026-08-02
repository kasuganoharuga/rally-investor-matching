import { PageShell } from "@/components/page-shell";
import { requirePageRole } from "@/features/auth/server/page-guards";
import { CompanyProfilePanel } from "@/features/company-profile/components/company-profile-panel";

export async function CompanyProfilePage() {
  const user = await requirePageRole(["founder"], "/investors");

  return (
    <PageShell width="form" active="company-profile" user={user}>
      <CompanyProfilePanel />
    </PageShell>
  );
}

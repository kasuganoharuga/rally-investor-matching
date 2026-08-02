import { PageShell } from "@/components/page-shell";
import { requirePageRole } from "@/features/auth/server/page-guards";
import { CompanyManagementPanel } from "@/features/company-management/components/company-management-panel";

export async function CompanyManagementPage() {
  const user = await requirePageRole(["admin", "reviewer"], "/investors");

  return (
    <PageShell width="wide" active="manage-companies" user={user}>
      <CompanyManagementPanel />
    </PageShell>
  );
}

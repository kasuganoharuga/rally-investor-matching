import { PageShell } from "@/components/page-shell";
import { requirePageRole } from "@/features/auth/server/page-guards";
import { InvestorManagementPanel } from "@/features/investor-management/components/investor-management-panel";

export async function InvestorManagementPage() {
  const user = await requirePageRole(["admin", "reviewer"], "/investors");

  return (
    <PageShell width="wide" active="manage-investors" user={user}>
      <InvestorManagementPanel />
    </PageShell>
  );
}

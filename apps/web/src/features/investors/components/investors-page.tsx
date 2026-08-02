import { PageShell } from "@/components/page-shell";
import { requirePageUser } from "@/features/auth/server/page-guards";
import { InvestorListPanel } from "@/features/investors/components/investor-list-panel";

export async function InvestorsPage() {
  const user = await requirePageUser();

  return (
    <PageShell width="wide" active="investors" user={user}>
      <InvestorListPanel />
    </PageShell>
  );
}

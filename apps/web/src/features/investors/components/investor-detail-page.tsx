import { PageShell } from "@/components/page-shell";
import { requirePageUser } from "@/features/auth/server/page-guards";
import { InvestorDetailPanel } from "@/features/investors/components/investor-detail-panel";

type InvestorDetailPageProps = {
  slug: string;
};

export async function InvestorDetailPage({ slug }: InvestorDetailPageProps) {
  const user = await requirePageUser();

  return (
    <PageShell width="content" active="investors" user={user}>
      <InvestorDetailPanel slug={slug} />
    </PageShell>
  );
}

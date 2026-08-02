import { PageShell } from "@/components/page-shell";
import { requirePageUser } from "@/features/auth/server/page-guards";
import { ShortlistPanel } from "@/features/shortlist/components/shortlist-panel";

export async function ShortlistPage() {
  const user = await requirePageUser();

  return (
    <PageShell width="wide" active="shortlist" user={user}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My shortlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Investors you saved from the directory, match results, or VC profiles.
          </p>
        </div>
      </div>
      <ShortlistPanel />
    </PageShell>
  );
}

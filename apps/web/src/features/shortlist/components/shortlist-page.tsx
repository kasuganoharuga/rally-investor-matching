import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/features/auth/server/page-guards";
import { ShortlistPanel } from "@/features/shortlist/components/shortlist-panel";

export async function ShortlistPage() {
  const user = await requirePageUser();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader active="shortlist" user={user} />

      <div className="mx-auto w-full max-w-[1440px] px-6 py-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My shortlist</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Investors you saved from the directory, match results, or VC profiles.
            </p>
          </div>
        </div>
        <ShortlistPanel />
      </div>
    </main>
  );
}

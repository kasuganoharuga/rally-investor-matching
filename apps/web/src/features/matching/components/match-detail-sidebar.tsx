import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  compactList,
  initials,
  locationLabel,
  titleCase,
  typicalCheque,
  websiteHost,
} from "@/features/matching/components/match-detail-format";
import type { MatchResult } from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

export function MatchDetailSidebar({
  match,
  onBack,
}: {
  match: MatchResult;
  onBack: () => void;
}) {
  const profile = match.investor_profile;
  const warmIntro = Boolean(profile?.warm_intro_available);

  return (
    <aside className="border-r border-border px-6 py-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to results
      </button>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-secondary">
            {initials(match.investor_name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-foreground">
              {match.investor_name}
            </h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {websiteHost(profile?.website_url)} · {locationLabel(profile)}
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Match score</dt>
            <dd className="font-semibold text-foreground">
              {Math.round(match.score)}
              <span className="text-muted-foreground">/100</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Recommended action</dt>
            <dd className="font-semibold text-primary">Review for intro</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Intro status</dt>
            <dd
              className={cn(
                "font-semibold",
                warmIntro ? "text-primary" : "text-warning",
              )}
            >
              {warmIntro ? "Path available" : "Path not confirmed"}
            </dd>
          </div>
        </dl>

        <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
          Next step: confirm warm intro route before outreach.
        </p>
      </section>

      <section className="mt-5 space-y-3 text-sm">
        <h2 className="text-xs font-bold uppercase text-muted-foreground">Key facts</h2>
        <dl className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Stage focus</dt>
            <dd className="font-semibold text-foreground">
              {compactList(profile?.stage_focus, 2)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Typical cheque</dt>
            <dd className="font-semibold text-foreground">{typicalCheque(profile)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Lead behaviour</dt>
            <dd className="font-semibold text-foreground">
              {titleCase(profile?.lead_behavior)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Warm intro</dt>
            <dd className="font-semibold text-primary">
              {warmIntro ? "Path available" : "Unknown"}
            </dd>
          </div>
        </dl>
      </section>

      <Button
        className="mt-6 w-full"
        size="lg"
        render={<Link href={`/investors/${match.investor_id}?from=match`} />}
      >
        View full VC profile
      </Button>
    </aside>
  );
}

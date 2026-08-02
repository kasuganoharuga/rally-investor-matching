import Link from "next/link";
import { BriefcaseBusiness, ExternalLink, Globe2, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { investorTypeLabel } from "@/features/investors/components/investor-detail-format";
import { SectorTag } from "@/features/investors/components/sector-tag";
import {
  initials,
  locationLabel,
  titleCase,
  websiteHost,
} from "@/features/matching/components/match-detail-format";
import type { MatchResult } from "@/features/matching/types/match";
import { ShortlistToggleButton } from "@/features/shortlist/components/shortlist-toggle-button";
import { useShortlist } from "@/features/shortlist/hooks/use-shortlist";
import { cn } from "@/lib/utils";

import { VcProfileMetaGrid, numericProfileValue } from "./vc-profile-meta";

const MAX_VISIBLE_TAGS = 3;

/**
 * Same identity-strip shape as the investor profile header, sourced from the
 * match's embedded investor_profile instead of a full InvestorDetail record —
 * this page has no shortlist/id plumbing beyond what the match result carries.
 */
export function MatchDetailHeader({
  match,
  coreStageLabel,
}: {
  match: MatchResult;
  coreStageLabel?: string | null;
}) {
  const shortlist = useShortlist();
  const profile = match.investor_profile;
  const leadRatio = numericProfileValue(profile?.lead_ratio);
  const leadsRounds = (profile?.lead_behavior ?? "").toLowerCase().includes("lead");

  const tags = [
    ...(profile?.sector_focus ?? []).map((value) => ({
      kind: "sector" as const,
      value,
    })),
    ...(profile?.stage_focus ?? []).map((value) => ({
      kind: "plain" as const,
      value,
    })),
  ];
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = tags.length - visibleTags.length;

  return (
    <header className="space-y-5">
      <div className="grid items-start gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-xl font-bold text-primary-foreground">
            {initials(match.investor_name)}
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-3xl leading-tight text-foreground">
              {match.investor_name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
                {investorTypeLabel(profile?.investor_type)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden="true" />
                {locationLabel(profile)}
              </span>
              {profile?.website_url ? (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium hover:text-foreground hover:underline"
                >
                  <Globe2 className="size-3.5" aria-hidden="true" />
                  {websiteHost(profile.website_url)}
                </a>
              ) : null}
              {profile?.linkedin_url ? (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium hover:text-foreground hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  LinkedIn
                </a>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {visibleTags.map((tag) =>
                tag.kind === "sector" ? (
                  <SectorTag key={`sector-${tag.value}`} sector={tag.value} />
                ) : (
                  <Badge key={`plain-${tag.value}`} variant="outline">
                    {titleCase(tag.value)}
                  </Badge>
                ),
              )}
              {hiddenTagCount > 0 ? (
                <Badge variant="ghost" className="text-muted-foreground">
                  +{hiddenTagCount} more
                </Badge>
              ) : null}
              {leadsRounds ? <Badge variant="secondary">Leads rounds</Badge> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <ShortlistToggleButton
            investorId={match.investor_id}
            investorName={match.investor_name}
            source="match_detail"
            isShortlisted={shortlist.isShortlisted(match.investor_id)}
            isPending={shortlist.isPending(match.investor_id)}
            onToggle={shortlist.toggle}
            presentation="action"
            className="min-w-40"
          />
          <Link
            href={`/investors/${match.investor_id}?from=match`}
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "min-w-44",
            )}
          >
            View full VC profile
          </Link>
        </div>
      </div>

      {shortlist.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {shortlist.error.message}
        </p>
      ) : null}

      <VcProfileMetaGrid
        reviewedDeals={String(
          profile?.total_deals_used ?? profile?.recent_deals.length ?? 0,
        )}
        leadRatio={leadRatio}
        coreStageLabel={coreStageLabel}
        updatedAt={profile?.updated_at}
      />
    </header>
  );
}

import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Globe2,
  MapPin,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { MatchResult } from "@/features/matching/types/match";
import { ShortlistToggleButton } from "@/features/shortlist/components/shortlist-toggle-button";
import { useShortlist } from "@/features/shortlist/hooks/use-shortlist";
import { cn } from "@/lib/utils";

import {
  initials,
  labelFromCode,
  locationLabel,
  toNumber,
  websiteHost,
} from "./vc-detail-utils";
import { ProfileMetric, ProfileTag } from "./vc-profile-primitives";

export function VcProfileHeader({ match }: { match: MatchResult }) {
  const shortlist = useShortlist();
  const profile = match.investor_profile;
  const preferences = profile?.stage_preferences ?? [];
  const deals = profile?.recent_deals ?? [];
  const stageCoverage = Math.max(
    preferences.length,
    Object.keys(profile?.stage_coverage ?? {}).length,
  );
  const totalDeals = toNumber(profile?.total_deals_used) ?? deals.length;
  const leadRatio = toNumber(profile?.lead_ratio);
  const confidence = toNumber(profile?.overall_confidence);
  const reviewed = profile?.screening_status?.toLowerCase() === "reviewed";

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-xl font-bold text-secondary">
                {initials(match.investor_name)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold text-foreground">
                    {match.investor_name}
                  </h1>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                      reviewed
                        ? "border-secondary bg-secondary/35 text-primary"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {reviewed ? (
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                    ) : null}
                    {reviewed ? "Reviewed profile" : "Evidence profile"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Globe2 className="size-3.5" aria-hidden="true" />
                    {profile?.website_url ? (
                      <a
                        href={profile.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:text-foreground hover:underline"
                      >
                        {websiteHost(profile.website_url)}
                      </a>
                    ) : (
                      websiteHost(profile?.website_url)
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {locationLabel(profile)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
                    {labelFromCode(profile?.investor_type)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile?.stage_focus ?? []).slice(0, 4).map((stage) => (
                    <ProfileTag key={stage}>{labelFromCode(stage)}</ProfileTag>
                  ))}
                  {(profile?.geography_focus ?? []).slice(0, 3).map((geography) => (
                    <ProfileTag key={geography}>{labelFromCode(geography)}</ProfileTag>
                  ))}
                  <ProfileTag accent>
                    {labelFromCode(profile?.lead_behavior)}
                  </ProfileTag>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ShortlistToggleButton
                investorId={match.investor_id}
                investorName={match.investor_name}
                source="vc_profile"
                isShortlisted={shortlist.isShortlisted(match.investor_id)}
                isPending={shortlist.isPending(match.investor_id)}
                onToggle={shortlist.toggle}
                presentation="action"
                className="min-w-40"
              />
              <a
                href="#match-profile-evidence"
                className={cn(buttonVariants({ size: "lg" }), "min-w-44")}
              >
                View match evidence
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-5 border-t border-border bg-muted/35 px-6 py-5 sm:grid-cols-3 xl:grid-cols-5">
          <ProfileMetric
            label="Match score"
            value={`${Math.round(match.score)}/100`}
            note={labelFromCode(match.match_tier)}
          />
          <ProfileMetric
            label="Deals analysed"
            value={String(totalDeals)}
            note="Core-stage evidence"
          />
          <ProfileMetric
            label="Stage coverage"
            value={String(stageCoverage)}
            note="Distinct rounds"
          />
          <ProfileMetric
            label="Lead rate"
            value={leadRatio === null ? "Unknown" : `${Math.round(leadRatio * 100)}%`}
            note={labelFromCode(profile?.lead_behavior)}
          />
          <ProfileMetric
            label="Confidence"
            value={
              confidence === null
                ? labelFromCode(profile?.data_quality)
                : `${Math.round(confidence * 100)}%`
            }
            note={labelFromCode(profile?.data_quality)}
          />
        </div>
      </section>

      {shortlist.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {shortlist.error.message}
        </p>
      ) : null}
    </>
  );
}

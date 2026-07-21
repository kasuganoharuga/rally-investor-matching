import { BarChart3, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { MatchResult } from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

import { formatDate, labelFromCode } from "./vc-detail-utils";
import { DataRow } from "./vc-profile-primitives";

const FACTORS: Record<string, { label: string; max: number }> = {
  stage_evidence_depth: { label: "Stage evidence", max: 10 },
  geography_fit: { label: "Geography", max: 5 },
  sector_fit: { label: "Sector", max: 15 },
  theme_fit: { label: "Specific direction", max: 25 },
  recent_deal_similarity: { label: "Recent deal similarity", max: 20 },
  customer_icp_fit: { label: "Customer / ICP", max: 10 },
  cheque_size_fit: { label: "Cheque size", max: 5 },
  lead_behavior_fit: { label: "Lead behaviour", max: 5 },
  data_quality_recency: { label: "Data quality", max: 5 },
};

function MatchIntelligence({ match }: { match: MatchResult }) {
  const factorRows = Object.entries(match.breakdown)
    .filter(([key, value]) => FACTORS[key] && value > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <section
      id="match-profile-evidence"
      className="scroll-mt-24 rounded-lg border border-primary bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Match intelligence
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Why this investor fits
          </h2>
        </div>
        <div className="text-right">
          <span className="text-4xl font-semibold text-primary">
            {Math.round(match.score)}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">/100</span>
        </div>
      </div>

      {factorRows.length > 0 ? (
        <div className="mt-5 space-y-3">
          {factorRows.map(([key, value]) => {
            const factor = FACTORS[key];
            return (
              <div key={key}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">{factor.label}</span>
                  <span className="text-muted-foreground">
                    {value}/{factor.max}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min((value / factor.max) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {match.strengths[0] ??
            "Detailed factor scoring is not available for this saved result."}
        </p>
      )}

      {match.strengths.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Strongest signals
          </p>
          <ul className="mt-2 space-y-2">
            {match.strengths.slice(0, 3).map((strength) => (
              <li
                key={strength}
                className="flex gap-2 text-sm leading-5 text-foreground"
              >
                <Sparkles
                  className="mt-0.5 size-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {strength}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {match.risks.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase text-amber-800">Watch-outs</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-900">
            {match.risks.slice(0, 3).map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ProfileConfidence({ match }: { match: MatchResult }) {
  const profile = match.investor_profile;
  const deals = profile?.recent_deals ?? [];
  const evidenceSources = new Set(
    deals
      .flatMap((deal) => [deal.investor_evidence_url, ...deal.source_urls])
      .filter(Boolean),
  ).size;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
        <h2 className="text-base font-semibold text-foreground">Profile confidence</h2>
      </div>
      <dl className="mt-4 space-y-3">
        <DataRow
          label="Review status"
          value={labelFromCode(profile?.screening_status)}
        />
        <DataRow label="Data quality" value={labelFromCode(profile?.data_quality)} />
        <DataRow label="Evidence links" value={String(evidenceSources)} />
        <DataRow label="Last updated" value={formatDate(profile?.updated_at, true)} />
      </dl>
    </section>
  );
}

function AccessAndOutreach({ match }: { match: MatchResult }) {
  const profile = match.investor_profile;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-primary" aria-hidden="true" />
        <h2 className="text-base font-semibold text-foreground">Access and outreach</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {profile?.warm_intro_available
          ? "A warm introduction route is recorded for this investor. Confirm the current owner before outreach."
          : "No confirmed warm introduction is attached. Use the verified public channels below."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {profile?.website_url ? (
          <a
            href={profile.website_url}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Website
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
        {profile?.linkedin_url ? (
          <a
            href={profile.linkedin_url}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            LinkedIn
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function VcProfileSidebar({ match }: { match: MatchResult }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <MatchIntelligence match={match} />
      <ProfileConfidence match={match} />
      <AccessAndOutreach match={match} />
    </aside>
  );
}

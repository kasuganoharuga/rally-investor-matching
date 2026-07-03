import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Link2,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { labelFromKey, orderedBreakdownEntries } from "./match-display";
import { Button } from "@/components/ui/button";
import type { MatchRecentDeal, MatchResult } from "@/features/matching/types/match";

type VcDetailPanelProps = {
  match: MatchResult;
  onBack: () => void;
};

const FACTOR_MAX_SCORES: Record<string, number> = {
  geography_anz_mandate: 6,
  stage_first_cheque_fit: 16,
  sector_use_case_fit: 17,
  recent_deal_similarity: 20,
  business_model_icp_fit: 12,
  cheque_round_size_fit: 8,
  lead_behavior_fit: 8,
  investor_activity_recency: 6,
  ai_thesis_appetite: 4,
  founder_traction_fit: 3,
};

function formatList(values: string[] | undefined, fallback = "Not specified"): string {
  const filtered = (values ?? []).filter(Boolean);
  if (filtered.length === 0) {
    return fallback;
  }
  return filtered.slice(0, 6).join(", ");
}

function titleCase(value: string | null | undefined): string {
  if (!value) {
    return "Not specified";
  }
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function websiteHost(url: string | null | undefined): string {
  if (!url) {
    return "Website not listed";
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function locationText(match: MatchResult): string {
  const profile = match.investor_profile;
  const parts = [profile?.hq_city, profile?.hq_state, profile?.hq_country]
    .filter(Boolean)
    .map(String);
  return parts.length > 0 ? parts.join(", ") : "Location not listed";
}

function amountText(deal: MatchRecentDeal): string {
  if (deal.amount_text) {
    return deal.amount_text;
  }
  if (typeof deal.amount_value === "number" && deal.amount_currency) {
    return `${deal.amount_currency} ${deal.amount_value.toLocaleString("en-AU")}`;
  }
  if (deal.amount) {
    return deal.amount;
  }
  return "Amount unknown";
}

function dealYear(deal: MatchRecentDeal): string {
  if (deal.date && /^\d{4}/.test(deal.date)) {
    return deal.date.slice(0, 4);
  }
  return "Year unknown";
}

function dealLine(deal: MatchRecentDeal): string {
  return [
    deal.company ?? "Company unknown",
    deal.round ?? "Round unknown",
    amountText(deal),
    deal.role ?? "Role unknown",
    dealYear(deal),
  ].join(" - ");
}

function confidenceText(match: MatchResult): string {
  const profile = match.investor_profile;
  const status = titleCase(profile?.screening_status);
  const priority = titleCase(profile?.screening_priority);
  const reviewed = profile?.updated_at ? String(profile.updated_at).slice(0, 10) : null;
  return reviewed
    ? `${priority} - ${status} - reviewed ${reviewed}`
    : `${priority} - ${status}`;
}

function contactText(match: MatchResult): string {
  const profile = match.investor_profile;
  if (profile?.preferred_channel) {
    return profile.preferred_channel;
  }
  if ((profile?.entry_channels ?? []).length > 0) {
    return formatList(profile?.entry_channels);
  }
  return "Contact path not listed";
}

function RecentDealRow({ deal }: { deal: MatchRecentDeal }) {
  const evidenceUrl = deal.investor_evidence_url;
  return (
    <li className="flex items-start justify-between gap-3 border-b border-dashed border-border py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-foreground">
          {dealLine(deal)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {deal.direction ??
            deal.business_model ??
            deal.company_geography ??
            "Evidence-backed recent deal"}
        </p>
      </div>
      {evidenceUrl ? (
        <a
          href={evidenceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          evidence
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      ) : null}
    </li>
  );
}

function ScoreBreakdown({ match }: { match: MatchResult }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        Score breakdown
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {orderedBreakdownEntries(match.breakdown).map(([key, value]) => (
          <div key={key} className="rounded-lg bg-card px-3 py-2">
            <p className="truncate text-xs text-muted-foreground">
              {labelFromKey(key)}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {value}
              {FACTOR_MAX_SCORES[key] ? (
                <span className="text-muted-foreground">/{FACTOR_MAX_SCORES[key]}</span>
              ) : null}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VcDetailPanel({ match, onBack }: VcDetailPanelProps) {
  const profile = match.investor_profile;
  const focusLine = [
    formatList(profile?.stage_focus),
    formatList(profile?.sector_focus),
    formatList(profile?.geography_focus),
    titleCase(profile?.lead_behavior),
  ].join(" - ");
  const deals = (profile?.recent_deals ?? []).slice(0, 3);
  const warmIntro = profile?.warm_intro_available;
  const eligibility = match.eligibility;

  return (
    <section className="grid min-h-[720px] overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="border-b border-border bg-background p-5 lg:border-b-0 lg:border-r">
        <Button type="button" variant="ghost" onClick={onBack} className="-ml-2">
          <ArrowLeft aria-hidden="true" />
          Back to results
        </Button>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {match.routing_pool_label} #{match.pool_rank ?? match.rank ?? "-"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            {match.investor_name}
          </h2>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Link2 className="size-4" aria-hidden="true" />
              {profile?.website_url ? (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {websiteHost(profile.website_url)}
                </a>
              ) : (
                websiteHost(profile?.website_url)
              )}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4" aria-hidden="true" />
              {locationText(match)}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Focus
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">{focusLine}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Recommended contact
            </p>
            <div className="mt-2 rounded-lg border border-dashed border-foreground/50 bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <UserRound className="size-4" aria-hidden="true" />
                {contactText(match)}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {warmIntro
                  ? "Warm-intro path appears available through current entry channels."
                  : "Use the listed channel or review CRM notes before routing."}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Confidence
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {confidenceText(match)}
            </p>
          </div>
        </div>
      </aside>

      <div className="space-y-5 p-5 lg:p-8">
        <div className="rounded-lg border-2 border-primary bg-background p-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-2xl font-semibold text-foreground">
              Why this is a match
            </h3>
            <p className="text-2xl font-semibold text-foreground">
              {match.score}
              <span className="text-base text-muted-foreground">/100</span>
            </p>
          </div>
          <ul className="mt-5 space-y-3">
            {match.strengths.slice(0, 5).map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <ScoreBreakdown match={match} />
          {eligibility ? (
            <div className="mt-4 rounded-lg bg-card px-3 py-2 text-sm text-muted-foreground">
              <p>
                Eligibility:{" "}
                {eligibility.hard_filter_reasons[0] ?? "Passed available hard filters."}
              </p>
              {eligibility.soft_warnings.length > 0 ? (
                <p className="mt-1">
                  Soft review: {eligibility.soft_warnings.join(" ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
            <span className="size-3 rounded-full bg-primary/70" />
            {warmIntro ? "Warm intro: available" : "Warm intro: needs review"}
          </span>
          <p className="text-sm text-muted-foreground">
            Rally should verify relationship path before introducing the founder.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Recent deals - evidence backed
          </p>
          <ul className="mt-3 rounded-lg border border-dashed border-foreground/50 bg-background px-4">
            {deals.length > 0 ? (
              deals.map((deal, index) => (
                <RecentDealRow
                  key={`${deal.company ?? "deal"}-${deal.date ?? index}`}
                  deal={deal}
                />
              ))
            ) : (
              <li className="py-4 text-sm text-muted-foreground">
                No recent deal rows on this record yet.
              </li>
            )}
          </ul>
        </div>

        <div className="border-t border-dashed border-border pt-5">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Internal only - warm intro detail
          </p>
          <div className="mt-3 rounded-lg border border-dashed border-foreground/50 bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
            <p>
              Entry channels: {formatList(profile?.entry_channels)}. AI appetite:{" "}
              {titleCase(profile?.ai_appetite)}. Founder-fit hints:{" "}
              {formatList(profile?.founder_fit)}.
            </p>
            {match.risks.length > 0 ? (
              <p className="mt-2">Review before outreach: {match.risks.join(" ")}</p>
            ) : (
              <p className="mt-2">
                No major risk flagged by the scoring layer; human review still required.
              </p>
            )}
          </div>
        </div>

        {profile?.screening_notes ? (
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Research notes
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {profile.screening_notes}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

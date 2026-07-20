import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  MatchInvestorProfile,
  MatchRecentDeal,
  MatchResult,
} from "@/features/matching/types/match";
import { ShortlistToggleButton } from "@/features/shortlist/components/shortlist-toggle-button";
import { useShortlist } from "@/features/shortlist/hooks/use-shortlist";
import { cn } from "@/lib/utils";

type MatchDetailPanelProps = {
  match: MatchResult;
  companyName: string;
  onBack: () => void;
  onViewFullProfile: () => void;
};

const FACTORS = [
  { key: "stage_evidence_depth", label: "Stage evidence depth", max: 10 },
  { key: "geography_fit", label: "Geography fit", max: 5 },
  { key: "sector_fit", label: "Sector fit", max: 15 },
  { key: "theme_fit", label: "Specific theme fit", max: 25 },
  { key: "recent_deal_similarity", label: "Recent deal similarity", max: 20 },
  { key: "customer_icp_fit", label: "Customer / ICP fit", max: 10 },
  { key: "cheque_size_fit", label: "Cheque size fit", max: 5 },
  { key: "lead_behavior_fit", label: "Lead behaviour fit", max: 5 },
  { key: "data_quality_recency", label: "Data quality / recency", max: 5 },
] as const;

function titleCase(value: string | null | undefined): string {
  if (!value) {
    return "Not listed";
  }
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function compactList(values: string[] | undefined, limit = 3): string {
  const filtered = (values ?? []).filter(Boolean).map(titleCase);
  if (filtered.length === 0) {
    return "Not listed";
  }
  const shown = filtered.slice(0, limit);
  const extra = filtered.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} +${extra}` : shown.join(", ");
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function locationLabel(profile: MatchInvestorProfile | undefined): string {
  const parts = [profile?.hq_city, profile?.hq_state, profile?.hq_country]
    .filter(Boolean)
    .map((item) => titleCase(String(item)));
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
  return "Not disclosed";
}

function formatDealDate(value: string | null | undefined): string {
  if (!value) {
    return "Year unknown";
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-AU", {
      month: "short",
      year: "numeric",
    }).format(parsed);
  }
  if (/^\d{4}/.test(value)) {
    return value.slice(0, 4);
  }
  return value;
}

function typicalCheque(profile: MatchInvestorProfile | undefined): string {
  const ranges = profile?.cheque_ranges ?? [];
  const firstRange = ranges.find((range) => range && typeof range === "object");
  if (!firstRange) {
    return "Not disclosed";
  }
  const min = firstRange.amount_min;
  const max = firstRange.amount_max;
  const currency = typeof firstRange.currency === "string" ? firstRange.currency : "";
  const fmt = (value: unknown) =>
    typeof value === "number"
      ? `${currency}${value >= 1000000 ? `${value / 1000000}m` : `${value / 1000}k`}`
      : null;
  const minText = fmt(min);
  const maxText = fmt(max);
  if (minText && maxText) {
    return `${minText}-${maxText}`;
  }
  return minText ? `${minText}+` : maxText ? `Up to ${maxText}` : "Not disclosed";
}

function factorTone(value: number, max: number): "strong" | "partial" | "weak" {
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.75) {
    return "strong";
  }
  if (ratio >= 0.45) {
    return "partial";
  }
  return "weak";
}

function factorLabel(tone: "strong" | "partial" | "weak"): string {
  if (tone === "strong") {
    return "Strong";
  }
  if (tone === "partial") {
    return "Partial";
  }
  return "Weak";
}

function leadDealCount(deals: MatchRecentDeal[]): number {
  return deals.filter((deal) => deal.role?.toLowerCase().includes("lead")).length;
}

function evidenceSummary(deals: MatchRecentDeal[]): string {
  const examples = deals
    .slice(0, 3)
    .map((deal) =>
      [deal.company, deal.round, amountText(deal), formatDealDate(deal.date)]
        .filter(Boolean)
        .join(" · "),
    );
  if (examples.length === 0) {
    return "No comparable deal rows are attached to this profile yet.";
  }
  return examples.join("; ");
}

function WatchOuts({ match }: { match: MatchResult }) {
  const risks =
    match.risks.length > 0
      ? match.risks.slice(0, 3)
      : ["Review cheque size and current lead behaviour before outreach."];

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4" aria-hidden="true" />
        <h2 className="font-semibold">Watch-outs before you reach out</h2>
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {risks.map((risk) => (
          <li key={risk} className="flex gap-2">
            <span className="mt-2 size-1.5 rounded-full bg-amber-600" />
            <span>{risk}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MatchDetailPanel({
  match,
  companyName,
  onBack,
  onViewFullProfile,
}: MatchDetailPanelProps) {
  const shortlist = useShortlist();
  const profile = match.investor_profile;
  const deals = profile?.recent_deals ?? [];
  const warmIntro = Boolean(profile?.warm_intro_available);

  return (
    <section className="mx-auto grid w-full max-w-[1440px] gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
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
                  warmIntro ? "text-primary" : "text-amber-700",
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
          <h2 className="text-xs font-bold uppercase text-muted-foreground">
            Key facts
          </h2>
          <dl className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Stage focus</dt>
              <dd className="font-semibold text-foreground">
                {compactList(profile?.stage_focus, 2)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Typical cheque</dt>
              <dd className="font-semibold text-foreground">
                {typicalCheque(profile)}
              </dd>
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

        <section className="mt-6 border-t border-border pt-5">
          <h2 className="text-xs font-bold uppercase text-muted-foreground">
            Recommended contact
          </h2>
          <div className="mt-3 rounded-lg border border-border bg-card p-4">
            <p className="font-semibold text-foreground">Rally intro team</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Partner or network route to confirm
            </p>
            <p className="mt-2 text-sm font-semibold text-primary">
              LinkedIn confirmed when available
            </p>
          </div>
        </section>

        <Button
          type="button"
          className="mt-6 w-full"
          size="lg"
          onClick={onViewFullProfile}
        >
          View full VC profile
        </Button>
      </aside>

      <div className="min-w-0 px-6 py-6">
        <section className="rounded-lg border border-primary bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Why {match.investor_name} is a match
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {match.investor_name} appears relevant for {companyName} based on
                observed stage, sector, geography, ICP, and recent deal evidence.
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-semibold text-primary">
                {Math.round(match.score)}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">/100</span>
            </div>
          </div>

          <div className="mt-5 space-y-4 border-t border-border pt-4">
            {FACTORS.map((factor) => {
              const rawValue = match.breakdown[factor.key] ?? 0;
              const percent = Math.max(
                0,
                Math.min(100, Math.round((rawValue / factor.max) * 100)),
              );
              const tone = factorTone(rawValue, factor.max);
              return (
                <div
                  key={factor.key}
                  className="grid gap-3 md:grid-cols-[170px_minmax(0,1fr)_88px]"
                >
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">
                      {factor.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rawValue}/{factor.max} pts
                    </p>
                  </div>
                  <div className="h-2 self-center rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        tone === "strong"
                          ? "bg-emerald-600"
                          : tone === "partial"
                            ? "bg-amber-500"
                            : "bg-muted-foreground",
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "self-center text-right text-sm font-semibold",
                      tone === "strong"
                        ? "text-emerald-700"
                        : tone === "partial"
                          ? "text-amber-700"
                          : "text-muted-foreground",
                    )}
                  >
                    {factorLabel(tone)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-5 space-y-4">
          <WatchOuts match={match} />

          <section
            className={cn(
              "rounded-lg border p-5",
              warmIntro
                ? "border-secondary bg-secondary/20 text-secondary-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="mt-1 size-2.5 rounded-full bg-primary" />
              <div>
                <h2 className="font-semibold">
                  {warmIntro ? "Warm intro path available" : "Intro path not confirmed"}
                </h2>
                <p className="mt-1 text-sm leading-6">
                  {warmIntro
                    ? "Rally has a possible route here. Request an intro and the team can review before forwarding."
                    : "No known warm path is attached yet. Review profile and network notes before outreach."}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-current/20 pt-4">
              <Button type="button">
                <ArrowRight className="size-4" aria-hidden="true" />
                Request warm intro
              </Button>
              <Button type="button" variant="outline">
                <Lightbulb className="size-4" aria-hidden="true" />
                Ask AI to draft outreach
              </Button>
            </div>
          </section>

          {shortlist.error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {shortlist.error.message}
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <ShortlistToggleButton
              investorId={match.investor_id}
              investorName={match.investor_name}
              source="match_detail"
              isShortlisted={shortlist.isShortlisted(match.investor_id)}
              isPending={shortlist.isPending(match.investor_id)}
              onToggle={shortlist.toggle}
              presentation="action"
              className="w-full"
            />
            <Button type="button" variant="outline" size="lg">
              <X className="size-4" aria-hidden="true" />
              Mark as not relevant
            </Button>
          </div>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Evidence snapshot
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The recent deals this match is based on, and why each one matters.
                </p>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                View all deals
              </span>
            </div>

            <div className="mt-4 grid overflow-hidden rounded-lg bg-primary text-primary-foreground md:grid-cols-3">
              <div className="border-b border-white/15 p-5 md:border-b-0 md:border-r">
                <p className="text-3xl font-semibold text-secondary">
                  {Math.min(deals.length, 99)}
                </p>
                <p className="mt-1 text-sm opacity-80">tracked comparable deals</p>
              </div>
              <div className="border-b border-white/15 p-5 md:border-b-0 md:border-r">
                <p className="text-3xl font-semibold text-secondary">
                  {typicalCheque(profile)}
                </p>
                <p className="mt-1 text-sm opacity-80">cheque range on profile</p>
              </div>
              <div className="p-5">
                <p className="text-3xl font-semibold text-secondary">
                  {leadDealCount(deals)} of {deals.length}
                </p>
                <p className="mt-1 text-sm opacity-80">led or anchored the round</p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
              {evidenceSummary(deals)}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

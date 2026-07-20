import { ArrowRight, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  MatchInvestorProfile,
  MatchRecentDeal,
  MatchResult,
} from "@/features/matching/types/match";
import { ShortlistToggleButton } from "@/features/shortlist/components/shortlist-toggle-button";
import { useShortlist } from "@/features/shortlist/hooks/use-shortlist";
import { cn } from "@/lib/utils";

type VcDetailPanelProps = {
  match: MatchResult;
  onBack?: () => void;
};

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

function compactList(values: string[] | undefined, limit = 4): string {
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
  return parts.length > 0 ? parts.join(" & ") : "Location not listed";
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
  return "-";
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

function reviewedDate(profile: MatchInvestorProfile | undefined): string {
  if (!profile?.updated_at) {
    return "Not listed";
  }
  const parsed = new Date(profile.updated_at);
  if (Number.isNaN(parsed.getTime())) {
    return String(profile.updated_at).slice(0, 10);
  }
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function ProfileTag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function TeamCard({
  name,
  role,
  recommended,
  muted,
}: {
  name: string;
  role: string;
  recommended?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{role}</p>
        </div>
        {recommended ? (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
            Recommended
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-sm font-medium",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {muted ? "LinkedIn not confirmed" : "LinkedIn ↗ · confirmed"}
      </p>
    </div>
  );
}

function RecentDealsTable({ deals }: { deals: MatchRecentDeal[] }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">Recent deals</h2>
        <span className="text-sm text-muted-foreground">
          All {deals.length} deals →
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border bg-background/70">
              <th className="px-5 py-3 font-semibold">Company</th>
              <th className="px-5 py-3 font-semibold">Round</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 text-right font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {deals.length > 0 ? (
              deals.slice(0, 6).map((deal, index) => (
                <tr
                  key={`${deal.company ?? "deal"}-${deal.date ?? index}`}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-5 py-4 font-semibold text-foreground">
                    {deal.company ?? "Company unknown"}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {deal.round ?? "Round unknown"}
                  </td>
                  <td className="px-5 py-4 font-semibold text-foreground">
                    {amountText(deal)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        deal.role?.toLowerCase().includes("lead")
                          ? "border-secondary bg-secondary/60 text-secondary-foreground"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {deal.role ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-muted-foreground">
                    {formatDealDate(deal.date)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                  No recent deal rows on this profile yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function VcDetailPanel({ match }: VcDetailPanelProps) {
  const shortlist = useShortlist();
  const profile = match.investor_profile;
  const deals = profile?.recent_deals ?? [];
  const about =
    profile?.screening_notes ??
    `${match.investor_name} is a potential match based on the current scoring profile and available investor evidence.`;
  const notablePortfolio = deals
    .map((deal) => deal.company)
    .filter(Boolean)
    .slice(0, 5) as string[];

  return (
    <section className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
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
                <span className="rounded-full border border-secondary bg-secondary/50 px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  ✓ Reviewed profile
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {profile?.website_url ? (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:text-foreground"
                  >
                    {websiteHost(profile.website_url)} ↗
                  </a>
                ) : (
                  websiteHost(profile?.website_url)
                )}{" "}
                · {locationLabel(profile)} · {titleCase(profile?.investor_type)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ProfileTag>{compactList(profile?.stage_focus, 2)}</ProfileTag>
                <ProfileTag>{compactList(profile?.sector_focus, 3)}</ProfileTag>
                <ProfileTag>{compactList(profile?.geography_focus, 3)}</ProfileTag>
                <ProfileTag>{titleCase(profile?.lead_behavior)}</ProfileTag>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
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
            <Button type="button" className="min-w-44">
              View your match report
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      {shortlist.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {shortlist.error.message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">About</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{about}</p>
            {notablePortfolio.length > 0 ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">
                  Notable portfolio
                </p>
                <div className="flex flex-wrap gap-2">
                  {notablePortfolio.map((company) => (
                    <ProfileTag key={company}>{company}</ProfileTag>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">
              Investment focus
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Stage focus
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {compactList(profile?.stage_focus, 3)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Typical cheque
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {typicalCheque(profile)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Lead behaviour
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {titleCase(profile?.lead_behavior)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Sector focus
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {compactList(profile?.sector_focus, 4)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Geography
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {compactList(profile?.geography_focus, 4)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Deals last 24 months
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {deals.length} tracked rounds
                </p>
              </div>
            </div>
          </section>

          <RecentDealsTable deals={deals} />
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Team</h2>
              <span className="text-sm text-muted-foreground">All contacts →</span>
            </div>
            <div className="mt-4 space-y-3">
              <TeamCard
                name="Alex Morgan"
                role="Partner · AI / SaaS focus"
                recommended
              />
              <TeamCard name="Sarah Chen" role="Principal · B2B SaaS, fintech" />
              <TeamCard name="Tom Riley" role="Associate · deeptech, climate" muted />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Data quality</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Profile status</dt>
                <dd className="font-semibold text-primary">
                  {titleCase(profile?.screening_status)} ✓
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Confidence</dt>
                <dd className="font-semibold text-foreground">
                  {titleCase(profile?.screening_priority)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Evidence sources</dt>
                <dd className="font-semibold text-foreground">
                  {Math.max(deals.length, match.evidence.length)} linked
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Last reviewed</dt>
                <dd className="font-semibold text-foreground">
                  {reviewedDate(profile)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Match score</h2>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-semibold text-foreground">
                {Math.round(match.score)}
              </span>
              <span className="pb-1 text-sm font-semibold text-muted-foreground">
                /100
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {match.strengths[0] ??
                "Score is based on stage, sector, geography, cheque, lead behavior, and recent deal evidence."}
            </p>
            {profile?.website_url ? (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Visit website
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </section>
        </aside>
      </div>
    </section>
  );
}

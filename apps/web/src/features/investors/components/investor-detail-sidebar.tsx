import { ExternalLink, Link2, MapPin, Radar, ShieldCheck } from "lucide-react";

import {
  investorTypeLabel,
  locationLabel,
  statusBadgeLabel,
  titleCase,
  websiteHost,
} from "@/features/investors/components/investor-detail-format";
import type { InvestorDetail } from "@/features/investors/types/investor";
import { cn } from "@/lib/utils";

function formatReviewedDate(value: string | null | undefined): string {
  if (!value) return "Not specified";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not specified";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(parsed);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function ContactCard({ investor }: { investor: InvestorDetail }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Contact and location</h2>
      <div className="mt-4 space-y-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {locationLabel(investor)}
        </p>
        <p className="flex items-center gap-2">
          <Link2 className="size-4 shrink-0" aria-hidden="true" />
          {investor.websiteUrl ? (
            <a
              href={investor.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              {websiteHost(investor.websiteUrl)}
            </a>
          ) : (
            websiteHost(investor.websiteUrl)
          )}
        </p>
        {investor.linkedinUrl ? (
          <p className="flex items-center gap-2">
            <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            <a
              href={investor.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              LinkedIn
            </a>
          </p>
        ) : null}
        <p>{investorTypeLabel(investor.investorType)}</p>
      </div>
    </section>
  );
}

function ProfileEvidenceCard({ investor }: { investor: InvestorDetail }) {
  const status = statusBadgeLabel(investor.screeningStatus);
  const confidence = investor.overallConfidence;
  const evidenceLinks = new Set(
    investor.recentDeals
      .flatMap((deal) => [deal.investor_evidence_url, ...deal.source_urls])
      .filter(Boolean),
  ).size;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Profile evidence
      </h2>
      <dl className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <dt className="text-muted-foreground">Review status</dt>
          <dd>
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                status.tone === "positive"
                  ? "border-secondary bg-secondary/35 text-primary"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              {status.label}
            </span>
          </dd>
        </div>
        <DetailRow label="Data quality" value={titleCase(investor.dataQuality)} />
        <DetailRow
          label="Confidence"
          value={
            typeof confidence === "number"
              ? `${Math.round(confidence * 100)}%`
              : "Not specified"
          }
        />
        <DetailRow label="Deals used" value={String(investor.totalDealsUsed ?? 0)} />
        <DetailRow label="Evidence links" value={String(evidenceLinks)} />
        <DetailRow
          label="Last updated"
          value={formatReviewedDate(investor.updatedAt)}
        />
      </dl>
    </section>
  );
}

function InvestmentApproachCard({ investor }: { investor: InvestorDetail }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Radar className="size-4" aria-hidden="true" />
        Investment approach
      </h2>
      <dl className="mt-4 space-y-3">
        <DetailRow label="Lead behaviour" value={titleCase(investor.leadBehavior)} />
        <DetailRow label="AI appetite" value={titleCase(investor.aiAppetite)} />
        <DetailRow
          label="Preferred channel"
          value={investor.preferredChannel ?? "Not specified"}
        />
      </dl>
      {investor.entryChannels.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Entry channels
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {investor.entryChannels.map((channel) => (
              <span
                key={channel}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground"
              >
                {titleCase(channel)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function InvestorDetailSidebar({ investor }: { investor: InvestorDetail }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <ContactCard investor={investor} />
      <ProfileEvidenceCard investor={investor} />
      <InvestmentApproachCard investor={investor} />
    </aside>
  );
}

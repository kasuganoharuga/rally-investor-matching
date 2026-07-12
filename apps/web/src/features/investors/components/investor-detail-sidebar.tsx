import { ExternalLink, Link2, MapPin, ShieldCheck } from "lucide-react";

import {
  investorTypeLabel,
  locationLabel,
  statusBadgeLabel,
  titleCase,
  websiteHost,
} from "@/features/investors/components/investor-detail-format";
import type { InvestorDetail } from "@/features/investors/types/investor";
import { cn } from "@/lib/utils";

type InvestorDetailSidebarProps = {
  investor: InvestorDetail;
};

function formatReviewedDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(parsed);
}

function ContactCard({ investor }: { investor: InvestorDetail }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Contact &amp; location</h2>

      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
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
              className="font-medium text-foreground underline-offset-4 hover:underline"
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
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              LinkedIn
            </a>
          </p>
        ) : null}
        <p>
          {investorTypeLabel(investor.investorType)}
          {investor.foundedYear ? ` \u00b7 est. ${investor.foundedYear}` : ""}
        </p>
      </div>
    </section>
  );
}

function ProfileStatusCard({ investor }: { investor: InvestorDetail }) {
  const status = statusBadgeLabel(investor.screeningStatus);
  const reviewedDate = formatReviewedDate(investor.updatedAt);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Profile status
      </h2>

      <dl className="mt-3 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                status.tone === "positive"
                  ? "border-[#9fb600] bg-secondary text-primary"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              {status.label}
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Priority</dt>
          <dd className="font-medium text-foreground">
            {titleCase(investor.screeningPriority)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Last reviewed</dt>
          <dd className="font-medium text-foreground">
            {reviewedDate ?? "Not specified"}
          </dd>
        </div>
      </dl>

      {investor.screeningNotes ? (
        <p className="mt-3 border-t border-dashed border-border pt-3 text-sm leading-6 text-muted-foreground">
          {investor.screeningNotes}
        </p>
      ) : null}
    </section>
  );
}

export function InvestorDetailSidebar({ investor }: InvestorDetailSidebarProps) {
  return (
    <div className="space-y-5">
      <ContactCard investor={investor} />
      <ProfileStatusCard investor={investor} />
    </div>
  );
}

import Link from "next/link";
import { Bookmark, ExternalLink, Link2, MapPin } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  initials,
  investorTypeLabel,
  leadsRounds,
  locationLabel,
  statusBadgeLabel,
  tagList,
  titleCase,
  websiteHost,
} from "@/features/investors/components/investor-detail-format";
import type { InvestorDetail } from "@/features/investors/types/investor";
import { cn } from "@/lib/utils";

type InvestorDetailHeaderProps = {
  investor: InvestorDetail;
};

function FocusChips({ investor }: { investor: InvestorDetail }) {
  const chips = [
    ...tagList(investor.stageFocus),
    ...tagList(investor.sectorFocus),
    ...tagList(investor.geographyFocus),
  ];
  if (investor.leadBehavior) {
    chips.push(titleCase(investor.leadBehavior));
  }
  if (chips.length === 0) {
    return null;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip, index) => (
        <span
          key={`${chip}-${index}`}
          className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

export function InvestorDetailHeader({ investor }: InvestorDetailHeaderProps) {
  const status = statusBadgeLabel(investor.screeningStatus);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initials(investor.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{investor.name}</h1>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  status.tone === "positive"
                    ? "border-[#9fb600] bg-secondary text-primary"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {status.label}
              </span>
              {leadsRounds(investor) ? (
                <span className="rounded-full border border-[#9fb600] bg-secondary px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Leads
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                {investorTypeLabel(investor.investorType)}
                {investor.foundedYear ? ` \u00b7 est. ${investor.foundedYear}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {locationLabel(investor)}
              </span>
              {investor.websiteUrl ? (
                <a
                  href={investor.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                >
                  <Link2 className="size-3.5" aria-hidden="true" />
                  {websiteHost(investor.websiteUrl)}
                </a>
              ) : null}
              {investor.linkedinUrl ? (
                <a
                  href={investor.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  LinkedIn
                </a>
              ) : null}
            </div>

            <FocusChips investor={investor} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
            aria-label={`Save ${investor.name} to shortlist`}
          >
            <Bookmark className="size-4" aria-hidden="true" />
            Save to shortlist
          </button>
          <Link
            href="/match"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-secondary text-secondary-foreground hover:bg-secondary/90",
            )}
          >
            Match me to this investor
          </Link>
        </div>
      </div>
    </section>
  );
}

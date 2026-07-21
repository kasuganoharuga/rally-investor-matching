import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ExternalLink,
  Globe2,
  MapPin,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  initials,
  investorTypeLabel,
  leadsRounds,
  locationLabel,
  statusBadgeLabel,
  titleCase,
  websiteHost,
} from "@/features/investors/components/investor-detail-format";
import { SectorTag } from "@/features/investors/components/sector-tag";
import type { InvestorDetail } from "@/features/investors/types/investor";
import { ShortlistToggleButton } from "@/features/shortlist/components/shortlist-toggle-button";
import type { ShortlistSource } from "@/features/shortlist/types/shortlist";
import { cn } from "@/lib/utils";

type InvestorDetailHeaderProps = {
  investor: InvestorDetail;
  isShortlisted: boolean;
  isShortlistPending: boolean;
  onToggleShortlist: (investorId: string, source: ShortlistSource) => void;
};

function HeaderTag({
  children,
  accent = false,
}: {
  children: string;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium",
        accent
          ? "border-secondary bg-secondary/30 text-primary"
          : "border-border bg-background text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function HeaderMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="min-w-0 border-l border-border px-5 first:border-l-0 first:pl-0">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold break-words text-foreground">{value}</p>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function numericValue(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function InvestorDetailHeader({
  investor,
  isShortlisted,
  isShortlistPending,
  onToggleShortlist,
}: InvestorDetailHeaderProps) {
  const status = statusBadgeLabel(investor.screeningStatus);
  const leadRatio = numericValue(investor.leadRatio);
  const confidence = numericValue(investor.overallConfidence);
  const stageCoverage = Math.max(
    investor.stagePreferences.length,
    Object.keys(investor.stageCoverage).length,
  );

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-xl font-bold text-secondary">
              {initials(investor.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold text-foreground">
                  {investor.name}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                    status.tone === "positive"
                      ? "border-secondary bg-secondary/35 text-primary"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {status.tone === "positive" ? (
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                  ) : null}
                  {status.label}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
                  {investorTypeLabel(investor.investorType)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {locationLabel(investor)}
                </span>
                {investor.websiteUrl ? (
                  <a
                    href={investor.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium hover:text-foreground hover:underline"
                  >
                    <Globe2 className="size-3.5" aria-hidden="true" />
                    {websiteHost(investor.websiteUrl)}
                  </a>
                ) : null}
                {investor.linkedinUrl ? (
                  <a
                    href={investor.linkedinUrl}
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
                {investor.stageFocus.slice(0, 4).map((stage) => (
                  <HeaderTag key={stage}>{titleCase(stage)}</HeaderTag>
                ))}
                {investor.sectorFocus.slice(0, 4).map((sector) => (
                  <SectorTag key={sector} sector={sector} />
                ))}
                {investor.geographyFocus.slice(0, 3).map((geography) => (
                  <HeaderTag key={geography}>{titleCase(geography)}</HeaderTag>
                ))}
                {leadsRounds(investor) ? (
                  <HeaderTag accent>Leads rounds</HeaderTag>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ShortlistToggleButton
              investorId={investor.id}
              investorName={investor.name}
              source="investor_profile"
              isShortlisted={isShortlisted}
              isPending={isShortlistPending}
              onToggle={onToggleShortlist}
              presentation="action"
              className="min-w-40"
            />
            <Link
              href="/match"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "min-w-44",
              )}
            >
              Match me to this investor
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-5 border-t border-border bg-muted/35 px-6 py-5 sm:grid-cols-4">
        <HeaderMetric
          label="Deals analysed"
          value={String(investor.totalDealsUsed ?? investor.recentDeals.length)}
          note="Core-stage evidence"
        />
        <HeaderMetric
          label="Stage coverage"
          value={String(stageCoverage)}
          note="Distinct rounds"
        />
        <HeaderMetric
          label="Lead rate"
          value={leadRatio === null ? "Unknown" : `${Math.round(leadRatio * 100)}%`}
          note={titleCase(investor.leadBehavior)}
        />
        <HeaderMetric
          label="Profile confidence"
          value={
            confidence === null
              ? titleCase(investor.dataQuality)
              : `${Math.round(confidence * 100)}%`
          }
          note={titleCase(investor.dataQuality)}
        />
      </div>
    </section>
  );
}

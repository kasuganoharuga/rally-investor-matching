import {
  BadgeCheck,
  BriefcaseBusiness,
  ExternalLink,
  Globe2,
  MapPin,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

const MAX_VISIBLE_TAGS = 3;

export function InvestorDetailIdentity({ investor }: { investor: InvestorDetail }) {
  const status = statusBadgeLabel(investor.screeningStatus);

  // Sectors first — they identify the investor. Stage is already in the
  // snapshot's core facts, and geography is omitted entirely: the whole deal
  // corpus is ANZ, so the tag separates nothing.
  const tags = [
    ...investor.sectorFocus.map((value) => ({ kind: "sector" as const, value })),
    ...investor.stageFocus.map((value) => ({ kind: "plain" as const, value })),
  ];
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = tags.length - visibleTags.length;

  return (
    <div className="flex min-w-0 gap-4">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-xl font-bold text-primary-foreground">
        {initials(investor.name)}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-serif text-3xl leading-tight text-foreground">
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
          {leadsRounds(investor) ? (
            <Badge variant="secondary">Leads rounds</Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

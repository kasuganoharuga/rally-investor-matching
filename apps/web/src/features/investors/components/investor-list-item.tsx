import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SectorTag } from "@/features/investors/components/sector-tag";
import type { InvestorSummary } from "@/features/investors/types/investor";
import { ShortlistToggleButton } from "@/features/shortlist/components/shortlist-toggle-button";
import type { ShortlistSource } from "@/features/shortlist/types/shortlist";
import { cn } from "@/lib/utils";

type InvestorListItemProps = {
  investor: InvestorSummary;
  isShortlisted?: boolean;
  isShortlistPending?: boolean;
  onToggleShortlist?: (investorId: string, source: ShortlistSource) => void;
};

function titleCase(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(name: string): string {
  const parts = name
    .replace(/\([^)]*\)/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function investorTypeLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    vc: "VC fund",
    angel_group: "Angel group",
    syndicate: "Syndicate",
    syndicate_platform: "Syndicate platform",
    government: "Government",
    debt_provider: "Debt provider",
    accelerator: "Accelerator / VC",
  };
  return labels[value ?? ""] ?? titleCase(value) ?? "Investor";
}

function locationLabel(investor: InvestorSummary): string {
  const parts = [investor.hqCity, investor.hqState, investor.hqCountry]
    .filter(Boolean)
    .map((value) => titleCase(String(value)));
  return parts.length > 0 ? parts.join(", ") : "Location pending";
}

function compactAmount(value: unknown, currency: string): string {
  if (typeof value !== "number") {
    return "";
  }
  const prefix =
    currency === "AUD" ? "A$" : currency === "USD" ? "US$" : `${currency} `;
  if (value >= 1_000_000) {
    return `${prefix}${Number((value / 1_000_000).toFixed(1))}m`;
  }
  if (value >= 1_000) {
    return `${prefix}${Number((value / 1_000).toFixed(0))}k`;
  }
  return `${prefix}${value.toLocaleString("en-AU")}`;
}

function roundSizeLabel(investor: InvestorSummary): string {
  const range = investor.chequeRanges.find((item) => {
    const currency = String(item.currency ?? "AUD").toUpperCase();
    return currency === "AUD" || currency === "USD";
  });
  if (!range) {
    return "Round size pending";
  }

  const currency = String(range.currency ?? "AUD").toUpperCase();
  const min = typeof range.amount_min === "number" ? range.amount_min : null;
  const max = typeof range.amount_max === "number" ? range.amount_max : null;
  if (min !== null && max !== null) {
    return `${compactAmount(min, currency)}-${compactAmount(max, currency).replace(
      /^(A\$|US\$)/,
      "",
    )}`;
  }
  if (min !== null) {
    return `${compactAmount(min, currency)}+`;
  }
  if (max !== null) {
    return `≤${compactAmount(max, currency)}`;
  }
  return "Round size pending";
}

function shortDescription(investor: InvestorSummary): string {
  const notes = investor.screeningNotes?.trim();
  if (notes) {
    return notes.split(/(?<=[.!?])\s+/)[0];
  }
  const focus = [...investor.sectorFocus, ...investor.businessModelFocus]
    .filter(Boolean)
    .map(titleCase);
  const geography = investor.geographyFocus.filter(Boolean).map(titleCase);
  if (focus.length === 0 && geography.length === 0) {
    return "No screening notes on file yet.";
  }
  const focusText =
    focus.length > 0 ? focus.slice(0, 2).join(" and ") : "a range of sectors";
  const geographyText =
    geography.length > 0 ? geography.slice(0, 2).join(" and ") : "the region";
  return `Focuses on ${focusText} across ${geographyText}.`;
}

function leadsRounds(investor: InvestorSummary): boolean {
  const value = investor.leadBehavior?.toLowerCase() ?? "";
  return value.includes("lead") || value.includes("co_lead");
}

const MAX_STAGE_TAGS = 2;
const MAX_SECTOR_TAGS = 1;

export function InvestorListItem({
  investor,
  isShortlisted = false,
  isShortlistPending = false,
  onToggleShortlist,
}: InvestorListItemProps) {
  const stages = investor.stageFocus.filter(Boolean);
  const sectors = investor.sectorFocus.filter(Boolean);

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          {initials(investor.name)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">
              {investor.name}
            </h3>
            {leadsRounds(investor) ? (
              <Badge variant="secondary">Leads rounds</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {investorTypeLabel(investor.investorType)}
            {investor.foundedYear ? ` · est. ${investor.foundedYear}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3 border-t border-border pt-4 text-sm">
        <div>
          <p className="text-muted-foreground">{locationLabel(investor)}</p>
          <p className="mt-1 font-semibold text-foreground">
            {roundSizeLabel(investor)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap justify-end gap-1.5">
            {stages.length > 0 ? (
              stages.slice(0, MAX_STAGE_TAGS).map((stage) => (
                <Badge key={stage} variant="outline">
                  {titleCase(stage)}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Stage pending</span>
            )}
            {stages.length > MAX_STAGE_TAGS ? (
              <Badge variant="ghost" className="text-muted-foreground">
                +{stages.length - MAX_STAGE_TAGS}
              </Badge>
            ) : null}
          </div>
          {sectors.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {sectors.slice(0, MAX_SECTOR_TAGS).map((sector) => (
                <SectorTag key={sector} sector={sector} className="px-2 py-0.5" />
              ))}
              {sectors.length > MAX_SECTOR_TAGS ? (
                <Badge variant="ghost" className="text-muted-foreground">
                  +{sectors.length - MAX_SECTOR_TAGS}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
        {shortDescription(investor)}
      </p>

      <div className="mt-auto flex items-center gap-2 pt-4">
        {investor.slug ? (
          <Link
            href={`/investors/${investor.slug}`}
            className={cn(buttonVariants({ size: "lg" }), "flex-1")}
          >
            View profile
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "flex-1 cursor-default text-muted-foreground",
            )}
          >
            Profile pending
          </span>
        )}
        {investor.websiteUrl ? (
          <a
            href={investor.websiteUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${investor.name} website`}
            className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }))}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : null}
        {onToggleShortlist ? (
          <ShortlistToggleButton
            investorId={investor.id}
            investorName={investor.name}
            source="investor_directory"
            isShortlisted={isShortlisted}
            isPending={isShortlistPending}
            onToggle={onToggleShortlist}
            className="size-9"
          />
        ) : null}
      </div>
    </article>
  );
}

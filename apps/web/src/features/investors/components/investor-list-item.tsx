import { ExternalLink } from "lucide-react";
import Link from "next/link";

import type { InvestorSummary } from "@/features/investors/types/investor";
import { ShortlistToggleButton } from "@/features/shortlist/components/shortlist-toggle-button";
import type { ShortlistSource } from "@/features/shortlist/types/shortlist";

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

function compactList(values: string[], limit = 2): string {
  const filtered = values.filter(Boolean).map(titleCase);
  if (filtered.length === 0) {
    return "Focus pending";
  }
  const visible = filtered.slice(0, limit).join("/");
  const extra = filtered.length > limit ? ` +${filtered.length - limit}` : "";
  return `${visible}${extra}`;
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

function chequeLabel(investor: InvestorSummary): string {
  const range = investor.chequeRanges.find((item) => {
    const currency = String(item.currency ?? "AUD").toUpperCase();
    return currency === "AUD" || currency === "USD";
  });
  if (!range) {
    return "Cheque pending";
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
  return "Cheque pending";
}

function shortDescription(investor: InvestorSummary): string {
  const notes = investor.screeningNotes?.trim();
  if (notes) {
    const firstSentence = notes.split(/(?<=[.!?])\s+/)[0];
    return firstSentence.length > 155
      ? `${firstSentence.slice(0, 152).trim()}...`
      : firstSentence;
  }
  return `Focuses on ${compactList([
    ...investor.sectorFocus,
    ...investor.businessModelFocus,
  ])} across ${compactList(investor.geographyFocus)}.`;
}

function leadsRounds(investor: InvestorSummary): boolean {
  const value = investor.leadBehavior?.toLowerCase() ?? "";
  return value.includes("lead") || value.includes("co_lead");
}

export function InvestorListItem({
  investor,
  isShortlisted = false,
  isShortlistPending = false,
  onToggleShortlist,
}: InvestorListItemProps) {
  const focusLine = compactList(investor.stageFocus, 2);
  const secondaryFocus = compactList(
    [...investor.sectorFocus, ...investor.businessModelFocus],
    2,
  );

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initials(investor.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">
                {investor.name}
              </h3>
              {leadsRounds(investor) ? (
                <span className="rounded-full border border-[#9fb600] bg-secondary px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Leads
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {investorTypeLabel(investor.investorType)}
              {investor.foundedYear ? ` · est. ${investor.foundedYear}` : ""}
            </p>
          </div>
        </div>

        {onToggleShortlist ? (
          <ShortlistToggleButton
            investorId={investor.id}
            investorName={investor.name}
            source="investor_directory"
            isShortlisted={isShortlisted}
            isPending={isShortlistPending}
            onToggle={onToggleShortlist}
            className="size-8"
          />
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3 border-t border-border pt-4 text-sm">
        <div>
          <p className="text-muted-foreground">{locationLabel(investor)}</p>
          <p className="mt-1 font-semibold text-foreground">{chequeLabel(investor)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">{focusLine}</p>
          <p className="mt-1 text-muted-foreground">{secondaryFocus}</p>
        </div>
      </div>

      <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">
        {shortDescription(investor)}
      </p>

      <div className="mt-4 flex items-center gap-2">
        {investor.slug ? (
          <Link
            href={`/investors/${investor.slug}`}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#0b4739]"
          >
            View profile
          </Link>
        ) : (
          <span className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-muted px-4 text-sm font-semibold text-muted-foreground">
            Profile pending
          </span>
        )}
        {investor.websiteUrl ? (
          <a
            href={investor.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary"
            aria-label={`Open ${investor.name} website`}
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
            className="size-10"
          />
        ) : null}
      </div>
    </article>
  );
}

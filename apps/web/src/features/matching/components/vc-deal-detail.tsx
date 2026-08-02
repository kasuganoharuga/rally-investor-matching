import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MatchRecentDeal } from "@/features/matching/types/match";
import { SectorTag } from "@/features/investors/components/sector-tag";

import { dealSecondaryUseCases, labelFromCode } from "./vc-detail-utils";

function evidenceUrl(deal: MatchRecentDeal): string | null {
  return deal.investor_evidence_url ?? deal.source_urls[0] ?? null;
}

export function VcDealDetail({ deal }: { deal: MatchRecentDeal }) {
  const source = evidenceUrl(deal);
  const direction = [deal.use_case_primary, ...dealSecondaryUseCases(deal)]
    .filter(Boolean)
    .slice(0, 2)
    .map((value) => labelFromCode(String(value)))
    .join(" / ");

  const facts = [
    { label: "Customer", value: labelFromCode(deal.customer_type) },
    { label: "Business model", value: labelFromCode(deal.business_model) },
    { label: "AI relevance", value: labelFromCode(deal.ai_relevance) },
  ].filter((fact) => fact.value && fact.value !== "Not listed");

  return (
    <div className="bg-muted/25 px-5 py-4">
      {deal.company_summary ? (
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {deal.company_summary}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {deal.actual_sector ? <SectorTag sector={deal.actual_sector} /> : null}
        {direction ? <Badge variant="outline">{direction}</Badge> : null}
      </div>

      {facts.length > 0 ? (
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs font-semibold uppercase text-muted-foreground/70">
                {fact.label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {source ? (
        <a
          href={source}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:underline"
        >
          Evidence source
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

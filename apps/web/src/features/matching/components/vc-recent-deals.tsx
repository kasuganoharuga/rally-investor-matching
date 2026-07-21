import { ExternalLink } from "lucide-react";

import type { MatchRecentDeal } from "@/features/matching/types/match";
import { SectorTag } from "@/features/investors/components/sector-tag";
import { cn } from "@/lib/utils";

import {
  dealAmount,
  dealSecondaryUseCases,
  formatDate,
  labelFromCode,
} from "./vc-detail-utils";

type VcRecentDealsProps = {
  deals: MatchRecentDeal[];
};

function evidenceUrl(deal: MatchRecentDeal): string | null {
  return deal.investor_evidence_url ?? deal.source_urls[0] ?? null;
}

export function VcRecentDeals({ deals }: VcRecentDealsProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Recent deal evidence
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Company-level evidence behind the observed sectors, themes, cheque range,
            and lead behaviour.
          </p>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {deals.length} tracked {deals.length === 1 ? "deal" : "deals"}
        </span>
      </div>

      {deals.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/55 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Round evidence</th>
                <th className="px-4 py-3 font-semibold">Sector and direction</th>
                <th className="px-4 py-3 font-semibold">Operating profile</th>
                <th className="px-6 py-3 text-right font-semibold">Deal</th>
              </tr>
            </thead>
            <tbody>
              {deals.slice(0, 12).map((deal, index) => {
                const source = evidenceUrl(deal);
                const secondaryUseCases = dealSecondaryUseCases(deal);
                return (
                  <tr
                    key={`${deal.company ?? "deal"}-${deal.date ?? index}`}
                    className="border-t border-border align-top"
                  >
                    <td className="max-w-[260px] px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {deal.company ?? "Company unknown"}
                        </p>
                        {source ? (
                          <a
                            href={source}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open evidence for ${deal.company ?? "deal"}`}
                            className="text-muted-foreground transition hover:text-primary"
                          >
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                      {deal.company_summary ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {deal.company_summary}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-foreground">
                        {labelFromCode(deal.round)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(deal.date)}
                      </p>
                    </td>
                    <td className="max-w-[260px] px-4 py-4">
                      {deal.actual_sector ? (
                        <SectorTag sector={deal.actual_sector} />
                      ) : (
                        <p className="font-medium text-muted-foreground">
                          Sector not classified
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[deal.use_case_primary, ...secondaryUseCases]
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((value) => labelFromCode(String(value)))
                          .join(" / ") || "Direction not classified"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">
                        {labelFromCode(deal.customer_type)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {labelFromCode(deal.business_model)} ·{" "}
                        {labelFromCode(deal.ai_relevance)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-foreground">
                        {dealAmount(deal)}
                      </p>
                      <span
                        className={cn(
                          "mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                          deal.role?.toLowerCase().includes("lead")
                            ? "border-secondary bg-secondary/35 text-primary"
                            : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {labelFromCode(deal.role)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-6 py-8 text-sm text-muted-foreground">
          No company-level deal evidence is linked to this investor yet.
        </p>
      )}
    </section>
  );
}

import { ExternalLink } from "lucide-react";

import {
  amountText,
  formatDealDate,
  sortDealsByDateDesc,
  titleCase,
} from "@/features/investors/components/investor-detail-format";
import type {
  InvestorDetail,
  InvestorRecentDeal,
} from "@/features/investors/types/investor";
import { cn } from "@/lib/utils";

const VISIBLE_DEAL_LIMIT = 5;

type InvestorDetailDealsProps = {
  investor: InvestorDetail;
};

function RolePill({ role }: { role: string | null | undefined }) {
  const normalized = role?.toLowerCase() ?? "";
  const isLead = normalized.includes("lead");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        isLead ? "bg-secondary text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {role ? titleCase(role) : "Role unknown"}
    </span>
  );
}

function DealRow({ deal }: { deal: InvestorRecentDeal }) {
  const evidenceUrl = deal.investor_evidence_url;
  return (
    <tr className="border-b border-dashed border-border last:border-b-0">
      <td className="py-3 pr-3 align-top">
        <p className="text-sm font-medium text-foreground">
          {deal.company ?? "Company unknown"}
        </p>
        {evidenceUrl ? (
          <a
            href={evidenceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            evidence
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        ) : null}
      </td>
      <td className="py-3 pr-3 align-top text-sm text-muted-foreground">
        {deal.round ?? "Round unknown"}
      </td>
      <td className="py-3 pr-3 align-top text-sm font-medium text-foreground">
        {amountText(deal)}
      </td>
      <td className="py-3 pr-3 align-top">
        <RolePill role={deal.role} />
      </td>
      <td className="py-3 align-top text-sm text-muted-foreground">
        {formatDealDate(deal)}
      </td>
    </tr>
  );
}

export function InvestorDetailDeals({ investor }: InvestorDetailDealsProps) {
  const sorted = sortDealsByDateDesc(investor.recentDeals);
  const visible = sorted.slice(0, VISIBLE_DEAL_LIMIT);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Recent deals</h2>
        {sorted.length > visible.length ? (
          <p className="text-xs text-muted-foreground">
            Showing {visible.length} of {sorted.length} tracked deals
          </p>
        ) : null}
      </div>

      {visible.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-muted-foreground">
                <th className="py-2 pr-3">Company</th>
                <th className="py-2 pr-3">Round</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((deal, index) => (
                <DealRow
                  key={`${deal.company ?? "deal"}-${deal.date ?? index}`}
                  deal={deal}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No recent deal rows on this record yet.
        </p>
      )}
    </section>
  );
}

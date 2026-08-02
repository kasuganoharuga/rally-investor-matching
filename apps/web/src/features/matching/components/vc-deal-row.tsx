import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MatchRecentDeal } from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

import { dealAmount, formatDate, labelFromCode } from "./vc-detail-utils";
import { VcDealDetail } from "./vc-deal-detail";

export function VcDealRow({
  deal,
  isOpen,
  onToggle,
}: {
  deal: MatchRecentDeal;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-t border-border transition hover:bg-muted/40"
        onClick={onToggle}
      >
        <td className="px-5 py-3">
          <button
            type="button"
            aria-expanded={isOpen}
            className="inline-flex items-center gap-1.5 text-left font-semibold text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition",
                isOpen && "rotate-90",
              )}
              aria-hidden="true"
            />
            {deal.company ?? "Company unknown"}
          </button>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
          {labelFromCode(deal.round)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
          {formatDate(deal.date)}
        </td>
        <td className="px-4 py-3 font-medium whitespace-nowrap text-foreground">
          {dealAmount(deal)}
        </td>
        <td className="px-5 py-3 text-right">
          <Badge
            variant={
              deal.role?.toLowerCase().includes("lead") ? "secondary" : "outline"
            }
          >
            {labelFromCode(deal.role)}
          </Badge>
        </td>
      </tr>
      {isOpen ? (
        <tr className="border-t border-border">
          <td colSpan={5} className="p-0">
            <VcDealDetail deal={deal} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

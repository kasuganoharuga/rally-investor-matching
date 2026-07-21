import { ChevronRight, MapPin } from "lucide-react";

import {
  confidencePercent,
  initials,
  investorLocation,
  investorTypeLabel,
  titleCase,
} from "@/features/investor-management/components/investor-management-format";
import { InvestorReviewBadge } from "@/features/investor-management/components/investor-review-badge";
import type { ManagedInvestor } from "@/features/investor-management/types/investor-management";
import { SectorTag } from "@/features/investors/components/sector-tag";
import { cn } from "@/lib/utils";

export function InvestorManagementListRow({
  investor,
  selected,
  onSelect,
}: {
  investor: ManagedInvestor;
  selected: boolean;
  onSelect: () => void;
}) {
  const sectors = [...new Set(investor.stages.flatMap((stage) => stage.sectors))];
  const stages = investor.stages.map((stage) => titleCase(stage.stage));
  const confidence = confidencePercent(investor.overallConfidence);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "grid w-full min-w-0 gap-4 border-b p-4 text-left transition-colors last:border-b-0 md:grid-cols-[minmax(0,1.35fr)_minmax(170px,0.8fr)_120px_18px] md:items-center",
        selected
          ? "bg-lime-50/70 shadow-[inset_3px_0_0_var(--primary)]"
          : "hover:bg-muted/45",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          {initials(investor.name)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-foreground">{investor.name}</p>
            <InvestorReviewBadge status={investor.reviewStatus} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {investorTypeLabel(investor.investorType)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" aria-hidden="true" />
            {investorLocation(investor)}
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {stages.slice(0, 2).map((stage) => (
            <span
              key={stage}
              className="rounded-full border bg-background px-2 py-1 text-xs"
            >
              {stage}
            </span>
          ))}
          {stages.length > 2 ? (
            <span className="text-xs text-muted-foreground">+{stages.length - 2}</span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {sectors.slice(0, 1).map((sector) => (
            <SectorTag key={sector} sector={sector} className="px-2 py-0.5" />
          ))}
          {sectors.length > 1 ? (
            <span className="self-center text-xs text-muted-foreground">
              +{sectors.length - 1}
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-semibold">{confidence}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${confidence}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {investor.totalDealsUsed} used · {investor.sourceCount} sources
        </p>
      </div>
      <ChevronRight
        className="hidden size-4 text-muted-foreground md:block"
        aria-hidden="true"
      />
    </button>
  );
}

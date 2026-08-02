import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { InvestorDetailIdentity } from "@/features/investors/components/investor-detail-identity";
import type { InvestorDetail } from "@/features/investors/types/investor";
import {
  VcProfileMetaGrid,
  numericProfileValue,
} from "@/features/matching/components/vc-profile-meta";
import { ShortlistToggleButton } from "@/features/shortlist/components/shortlist-toggle-button";
import type { ShortlistSource } from "@/features/shortlist/types/shortlist";
import { cn } from "@/lib/utils";

type InvestorDetailHeaderProps = {
  investor: InvestorDetail;
  isShortlisted: boolean;
  isShortlistPending: boolean;
  onToggleShortlist: (investorId: string, source: ShortlistSource) => void;
  /** Derived upstream from the stage-preference rows. */
  coreStageLabel?: string | null;
};

export function InvestorDetailHeader({
  investor,
  isShortlisted,
  isShortlistPending,
  onToggleShortlist,
  coreStageLabel,
}: InvestorDetailHeaderProps) {
  const leadRatio = numericProfileValue(investor.leadRatio);

  return (
    <header className="space-y-5">
      <div className="grid items-start gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <InvestorDetailIdentity investor={investor} />

        <div className="flex flex-wrap gap-2 lg:justify-end">
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

      {/*
        Four facts, not seven. Stage coverage and evidence-link counts are
        second-order, and a bare "91% confidence" reads as precision the
        reader can't interpret — it now sits beside the judgement it
        qualifies in the behaviour snapshot instead.
      */}
      <VcProfileMetaGrid
        reviewedDeals={String(investor.totalDealsUsed ?? investor.recentDeals.length)}
        leadRatio={leadRatio}
        coreStageLabel={coreStageLabel}
        updatedAt={investor.updatedAt}
      />
    </header>
  );
}

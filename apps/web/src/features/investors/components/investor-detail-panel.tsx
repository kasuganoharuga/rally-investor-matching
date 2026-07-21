"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  InvestorDetailError,
  InvestorDetailLoading,
  InvestorDetailNotFound,
} from "@/features/investors/components/investor-detail-states";
import { InvestorDetailHeader } from "@/features/investors/components/investor-detail-header";
import { InvestorDetailSidebar } from "@/features/investors/components/investor-detail-sidebar";
import { useInvestorDetail } from "@/features/investors/hooks/use-investor-detail";
import type { InvestorDetail } from "@/features/investors/types/investor";
import { VcInvestmentThesis } from "@/features/matching/components/vc-investment-thesis";
import { VcRecentDeals } from "@/features/matching/components/vc-recent-deals";
import { VcStagePreferences } from "@/features/matching/components/vc-stage-preferences";
import { useShortlist } from "@/features/shortlist/hooks/use-shortlist";

type InvestorDetailPanelProps = {
  slug: string;
};

function InvestorDetailContent({
  investor,
  shortlist,
}: {
  investor: InvestorDetail;
  shortlist: ReturnType<typeof useShortlist>;
}) {
  return (
    <div className="space-y-5">
      <Link
        href="/investors"
        className="-ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to directory
      </Link>

      {shortlist.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {shortlist.error.message}
        </p>
      ) : null}

      <InvestorDetailHeader
        investor={investor}
        isShortlisted={shortlist.isShortlisted(investor.id)}
        isShortlistPending={shortlist.isPending(investor.id)}
        onToggleShortlist={shortlist.toggle}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <VcInvestmentThesis
            activitySummary={investor.activitySummary}
            screeningNotes={investor.screeningNotes}
            sectorFocus={investor.sectorFocus}
            themeFocus={investor.businessModelFocus}
            preferences={investor.stagePreferences}
          />
          <VcStagePreferences preferences={investor.stagePreferences} />
          <VcRecentDeals deals={investor.recentDeals} />
        </div>

        <InvestorDetailSidebar investor={investor} />
      </div>
    </div>
  );
}

export function InvestorDetailPanel({ slug }: InvestorDetailPanelProps) {
  const { investor, isLoading, error, notFound, reload } = useInvestorDetail(slug);
  const shortlist = useShortlist();

  if (isLoading) {
    return <InvestorDetailLoading />;
  }

  if (notFound) {
    return <InvestorDetailNotFound />;
  }

  if (error) {
    return <InvestorDetailError message={error.message} onRetry={reload} />;
  }

  if (!investor) {
    return <InvestorDetailNotFound />;
  }

  return <InvestorDetailContent investor={investor} shortlist={shortlist} />;
}

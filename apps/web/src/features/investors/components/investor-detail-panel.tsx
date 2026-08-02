"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import {
  InvestorDetailError,
  InvestorDetailLoading,
  InvestorDetailNotFound,
} from "@/features/investors/components/investor-detail-states";
import { titleCase } from "@/features/investors/components/investor-detail-format";
import { InvestorDetailHeader } from "@/features/investors/components/investor-detail-header";
import { useInvestorDetail } from "@/features/investors/hooks/use-investor-detail";
import type { InvestorDetail } from "@/features/investors/types/investor";
import {
  VcBehaviourEmptyState,
  VcBehaviourOverview,
} from "@/features/matching/components/vc-behaviour-overview";
import { buildBehaviourProfile } from "@/features/matching/components/vc-behaviour-profile";
import {
  VcDetailTabs,
  type VcDetailTab,
} from "@/features/matching/components/vc-detail-tabs";
import { VcFitPanel } from "@/features/matching/components/vc-fit-panel";
import { VcInvestmentPatterns } from "@/features/matching/components/vc-investment-patterns";
import { VcRecentDeals } from "@/features/matching/components/vc-recent-deals";
import { useShortlist } from "@/features/shortlist/hooks/use-shortlist";

type InvestorDetailPanelProps = {
  slug: string;
};

const DEALS_ANCHOR_ID = "deals-and-evidence";

function InvestorDetailContent({
  investor,
  shortlist,
}: {
  investor: InvestorDetail;
  shortlist: ReturnType<typeof useShortlist>;
}) {
  const [tab, setTab] = useState<VcDetailTab>("overview");
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const profile = buildBehaviourProfile({
    preferences: investor.stagePreferences,
    sectorFocus: investor.sectorFocus,
    themeFocus: investor.businessModelFocus,
    leadRatio: investor.leadRatio ?? null,
    totalDeals: investor.totalDealsUsed ?? null,
    dataQuality: investor.dataQuality ?? null,
  });

  const coreStageLabel =
    profile?.metrics.find((metric) => metric.label === "Core stage")?.value ?? null;

  function openDealsForStage(stage: string) {
    setActiveStage(stage);
    setTab("evidence");
    // The tab panel mounts on switch, so wait a frame before scrolling to it.
    requestAnimationFrame(() => {
      document
        .getElementById(DEALS_ANCHOR_ID)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="space-y-6">
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
        coreStageLabel={coreStageLabel}
      />

      <VcDetailTabs
        tab={tab}
        onTabChange={setTab}
        evidenceAnchorId={DEALS_ANCHOR_ID}
        overview={
          <VcBehaviourOverview
            profile={profile}
            onViewDeals={openDealsForStage}
            stageDescription="Open a row for the evidence behind that stage."
            sidebar={
              profile ? (
                <VcFitPanel
                  profile={profile}
                  onViewEvidence={() => setTab("evidence")}
                />
              ) : null
            }
            emptyFallback={
              <VcBehaviourEmptyState onOpenEvidence={() => setTab("evidence")} />
            }
          />
        }
        evidence={
          <>
            <VcRecentDeals
              deals={investor.recentDeals}
              activeStage={activeStage}
              onClearStage={() => setActiveStage(null)}
            />

            {profile ? (
              <VcInvestmentPatterns
                profile={profile}
                preferences={investor.stagePreferences}
                activitySummary={investor.activitySummary}
                screeningNotes={investor.screeningNotes}
                approach={{
                  aiAppetite: titleCase(investor.aiAppetite),
                  preferredChannel: investor.preferredChannel ?? "Not specified",
                  entryChannels: investor.entryChannels,
                }}
              />
            ) : null}
          </>
        }
      />
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

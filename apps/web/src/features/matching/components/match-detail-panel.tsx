"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { titleCase } from "@/features/investors/components/investor-detail-format";
import {
  VcBehaviourEmptyState,
  VcBehaviourOverview,
} from "@/features/matching/components/vc-behaviour-overview";
import { buildBehaviourProfile } from "@/features/matching/components/vc-behaviour-profile";
import {
  VcDetailTabs,
  type VcDetailTab,
} from "@/features/matching/components/vc-detail-tabs";
import { VcInvestmentPatterns } from "@/features/matching/components/vc-investment-patterns";
import { MatchDetailHeader } from "@/features/matching/components/match-detail-header";
import { VcMatchVerdict } from "@/features/matching/components/vc-match-verdict";
import { VcRecentDeals } from "@/features/matching/components/vc-recent-deals";
import type { MatchResult } from "@/features/matching/types/match";

type MatchDetailPanelProps = {
  match: MatchResult;
  companyName: string;
  onBack: () => void;
};

const DEALS_ANCHOR_ID = "match-deal-evidence";

export function MatchDetailPanel({
  match,
  companyName,
  onBack,
}: MatchDetailPanelProps) {
  const [tab, setTab] = useState<VcDetailTab>("overview");
  const matchedStage = match.match_context?.matched_stage ?? null;
  const [activeStage, setActiveStage] = useState<string | null>(matchedStage);

  const investorProfile = match.investor_profile;
  const profile = buildBehaviourProfile({
    preferences: investorProfile?.stage_preferences ?? [],
    sectorFocus: investorProfile?.sector_focus ?? [],
    themeFocus: investorProfile?.business_model_focus ?? [],
    leadRatio: investorProfile?.lead_ratio ?? null,
    totalDeals: investorProfile?.total_deals_used ?? null,
    dataQuality: investorProfile?.data_quality ?? null,
  });

  const coreStageLabel =
    profile?.metrics.find((metric) => metric.label === "Core stage")?.value ?? null;
  const verdict = <VcMatchVerdict match={match} companyName={companyName} />;

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
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-7 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to results
      </button>

      <MatchDetailHeader match={match} coreStageLabel={coreStageLabel} />

      <VcDetailTabs
        tab={tab}
        onTabChange={setTab}
        evidenceAnchorId={DEALS_ANCHOR_ID}
        overview={
          <VcBehaviourOverview
            profile={profile}
            sidebar={verdict}
            matchedStage={matchedStage}
            onViewDeals={openDealsForStage}
            stageDescription={
              matchedStage
                ? `${companyName}'s stage is highlighted below.`
                : "Open a row for the evidence behind that stage."
            }
            emptyFallback={
              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <VcBehaviourEmptyState onOpenEvidence={() => setTab("evidence")} />
                {verdict}
              </div>
            }
          />
        }
        evidence={
          <>
            <VcRecentDeals
              deals={investorProfile?.recent_deals ?? []}
              activeStage={activeStage}
              onClearStage={() => setActiveStage(null)}
            />

            {profile ? (
              <VcInvestmentPatterns
                profile={profile}
                preferences={investorProfile?.stage_preferences ?? []}
                activitySummary={investorProfile?.activity_summary}
                screeningNotes={investorProfile?.screening_notes}
                approach={{
                  aiAppetite: titleCase(investorProfile?.ai_appetite),
                  preferredChannel:
                    investorProfile?.preferred_channel ?? "Not specified",
                  entryChannels: investorProfile?.entry_channels ?? [],
                }}
              />
            ) : null}
          </>
        }
      />
    </section>
  );
}

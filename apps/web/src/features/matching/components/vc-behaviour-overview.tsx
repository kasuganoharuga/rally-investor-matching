import type { ReactNode } from "react";

import { SectionHeading } from "@/components/section-heading";

import type { BehaviourProfile } from "./vc-behaviour-profile";
import { VcBehaviourSnapshot } from "./vc-behaviour-snapshot";
import { VcStageTable } from "./vc-stage-table";

export function VcBehaviourOverview({
  profile,
  sidebar,
  stageDescription,
  onViewDeals,
  matchedStage,
  emptyFallback,
}: {
  profile: BehaviourProfile | null;
  sidebar: ReactNode;
  stageDescription: string;
  onViewDeals: (stage: string) => void;
  matchedStage?: string | null;
  emptyFallback: ReactNode;
}) {
  if (!profile) {
    return emptyFallback;
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <VcBehaviourSnapshot profile={profile} />

        <div>
          <SectionHeading title="Stage behaviour" description={stageDescription} />
          <VcStageTable
            profile={profile}
            onViewDeals={onViewDeals}
            matchedStage={matchedStage}
          />
          {profile.stageNarrative ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {profile.stageNarrative}
            </p>
          ) : null}
        </div>
      </div>

      {sidebar}
    </div>
  );
}

export function VcBehaviourEmptyState({
  onOpenEvidence,
}: {
  onOpenEvidence: () => void;
}) {
  return (
    <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
      No stage-preference rows have been generated for this investor yet, so there is
      nothing to summarise. The deal record is still under{" "}
      <button
        type="button"
        onClick={onOpenEvidence}
        className="font-semibold text-primary hover:underline"
      >
        Deals &amp; evidence
      </button>
      .
    </p>
  );
}

import type { MatchResult } from "@/features/matching/types/match";

import { VcInvestmentThesis } from "./vc-investment-thesis";
import { VcProfileHeader } from "./vc-profile-header";
import { VcProfileSidebar } from "./vc-profile-sidebar";
import { VcRecentDeals } from "./vc-recent-deals";
import { VcStagePreferences } from "./vc-stage-preferences";

type VcDetailPanelProps = {
  match: MatchResult;
  onBack?: () => void;
};

export function VcDetailPanel({ match }: VcDetailPanelProps) {
  const profile = match.investor_profile;

  return (
    <section className="space-y-5">
      <VcProfileHeader match={match} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-5">
          <VcInvestmentThesis
            activitySummary={profile?.activity_summary}
            screeningNotes={profile?.screening_notes}
            sectorFocus={profile?.sector_focus ?? []}
            themeFocus={profile?.business_model_focus ?? []}
            preferences={profile?.stage_preferences ?? []}
          />
          <VcStagePreferences preferences={profile?.stage_preferences ?? []} />
          <VcRecentDeals deals={profile?.recent_deals ?? []} />
        </div>
        <VcProfileSidebar match={match} />
      </div>
    </section>
  );
}

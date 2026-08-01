import { MatchDetailActions } from "@/features/matching/components/match-detail-actions";
import { MatchDetailBreakdown } from "@/features/matching/components/match-detail-breakdown";
import { MatchDetailEvidence } from "@/features/matching/components/match-detail-evidence";
import { MatchDetailSidebar } from "@/features/matching/components/match-detail-sidebar";
import type { MatchResult } from "@/features/matching/types/match";

type MatchDetailPanelProps = {
  match: MatchResult;
  companyName: string;
  onBack: () => void;
};

export function MatchDetailPanel({
  match,
  companyName,
  onBack,
}: MatchDetailPanelProps) {
  const profile = match.investor_profile;
  const allDeals = profile?.recent_deals ?? [];
  const matchContext = match.match_context;
  const comparableDeals = matchContext
    ? allDeals.filter(
        (deal) => deal.company && matchContext.comparable_deals.includes(deal.company),
      )
    : allDeals;
  const isLegacyMatch = !matchContext;

  return (
    <section className="mx-auto grid w-full max-w-[1440px] gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
      <MatchDetailSidebar match={match} onBack={onBack} />
      <div className="min-w-0 px-6 py-6">
        <MatchDetailBreakdown match={match} companyName={companyName} />
        <div className="mt-5 space-y-4">
          <MatchDetailActions match={match} />
          <MatchDetailEvidence
            match={match}
            comparableDeals={comparableDeals}
            isLegacyMatch={isLegacyMatch}
          />
        </div>
      </div>
    </section>
  );
}

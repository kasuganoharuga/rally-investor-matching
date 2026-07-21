import { confidencePercent } from "@/features/investor-management/components/investor-management-format";
import type {
  InvestorQualityFilter,
  InvestorReviewFilter,
  InvestorSort,
} from "@/features/investor-management/components/investor-management-toolbar";
import {
  investorSectors,
  investorThemes,
  type ManagedInvestor,
} from "@/features/investor-management/types/investor-management";

const REVIEW_ORDER: Record<string, number> = {
  unreviewed: 0,
  needs_more_data: 1,
  corrected: 2,
  approved: 3,
  rejected: 4,
};

export function filterManagedInvestors(
  items: ManagedInvestor[],
  query: string,
  review: InvestorReviewFilter,
  quality: InvestorQualityFilter,
  sort: InvestorSort,
): ManagedInvestor[] {
  const normalized = query.trim().toLowerCase();
  const filtered = items.filter((investor) => {
    if (
      review === "queue" &&
      !["unreviewed", "needs_more_data"].includes(investor.reviewStatus)
    )
      return false;
    if (
      review === "reviewed" &&
      !["approved", "corrected"].includes(investor.reviewStatus)
    )
      return false;
    if (
      !["queue", "all", "reviewed"].includes(review) &&
      investor.reviewStatus !== review
    )
      return false;
    if (quality !== "all" && investor.dataQuality !== quality) return false;
    if (!normalized) return true;
    return [
      investor.name,
      investor.investorType,
      investor.hqCountry,
      investor.hqState,
      investor.hqCity,
      ...investor.stages.map((stage) => stage.stage),
      ...investorSectors(investor),
      ...investorThemes(investor),
    ].some((value) => value?.toLowerCase().includes(normalized));
  });

  return [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "confidence") {
      return (
        confidencePercent(b.overallConfidence) - confidencePercent(a.overallConfidence)
      );
    }
    if (sort === "deals") return b.totalDealsUsed - a.totalDealsUsed;
    return (
      REVIEW_ORDER[a.reviewStatus] - REVIEW_ORDER[b.reviewStatus] ||
      b.totalDealsUsed - a.totalDealsUsed
    );
  });
}

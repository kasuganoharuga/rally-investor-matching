import { z } from "zod";

export const investorReviewStatusSchema = z.enum([
  "unreviewed",
  "approved",
  "corrected",
  "rejected",
  "needs_more_data",
]);

export const managedInvestorStageSchema = z.object({
  stage: z.string(),
  dealsCount: z.number().int().nonnegative(),
  leadCount: z.number().int().nonnegative(),
  participantCount: z.number().int().nonnegative(),
  chequeSizeMinUsd: z.number().nullable(),
  chequeSizeMaxUsd: z.number().nullable(),
  sectors: z.array(z.string()),
  themes: z.array(z.string()),
  dataQuality: z.string().nullable(),
});

export const managedInvestorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  investorType: z.string(),
  websiteUrl: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  hqCountry: z.string().nullable(),
  hqState: z.string().nullable(),
  hqCity: z.string().nullable(),
  status: z.string(),
  reviewStatus: investorReviewStatusSchema,
  lastReviewedAt: z.string().nullable(),
  reviewerName: z.string().nullable(),
  dataQuality: z.string().nullable(),
  overallConfidence: z.number().nullable(),
  totalDealsFound: z.number().int().nonnegative(),
  totalDealsUsed: z.number().int().nonnegative(),
  activitySummary: z.string().nullable(),
  generatedAt: z.string().nullable(),
  claimedThesis: z.string().nullable(),
  sourceCount: z.number().int().nonnegative(),
  dealCount: z.number().int().nonnegative(),
  teamMemberCount: z.number().int().nonnegative(),
  reviewHistoryCount: z.number().int().nonnegative(),
  stages: z.array(managedInvestorStageSchema),
  updatedAt: z.string(),
});

export const managedInvestorListSchema = z.object({
  items: z.array(managedInvestorSchema),
});

export const updateInvestorReviewSchema = z.object({
  reviewStatus: z.enum(["approved", "needs_more_data", "rejected"]),
  note: z.string().trim().max(500).nullable().optional(),
});

export type ManagedInvestor = z.infer<typeof managedInvestorSchema>;
export type InvestorReviewStatus = z.infer<typeof investorReviewStatusSchema>;
export type UpdateInvestorReviewInput = z.infer<typeof updateInvestorReviewSchema>;

export function investorSectors(investor: ManagedInvestor): string[] {
  return [...new Set(investor.stages.flatMap((stage) => stage.sectors))];
}

export function investorThemes(investor: ManagedInvestor): string[] {
  return [...new Set(investor.stages.flatMap((stage) => stage.themes))];
}

export function investorEvidenceCompletion(investor: ManagedInvestor): number {
  const checks = [
    Boolean(investor.websiteUrl),
    Boolean(investor.hqCountry),
    investor.sourceCount > 0,
    investor.totalDealsUsed > 0,
    investor.stages.length > 0,
    investorSectors(investor).length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function investorNeedsReview(investor: ManagedInvestor): boolean {
  return ["unreviewed", "needs_more_data"].includes(investor.reviewStatus);
}

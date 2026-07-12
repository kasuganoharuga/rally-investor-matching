import { z } from "zod";

export const SCREENING_STATUS = {
  UNSCREENED: "unscreened",
  SCREENED: "screened",
  PRIORITY: "priority",
} as const;

export const investorSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  slug: z.string().nullable(),
  investorType: z.string().nullable(),
  websiteUrl: z.string().nullable().optional(),
  foundedYear: z.number().nullable().optional(),
  hqCountry: z.string().nullable(),
  hqState: z.string().nullable().optional(),
  hqCity: z.string().nullable().optional(),
  stageFocus: z.array(z.string()),
  sectorFocus: z.array(z.string()).default([]),
  geographyFocus: z.array(z.string()).default([]),
  businessModelFocus: z.array(z.string()).default([]),
  chequeRanges: z.array(z.record(z.string(), z.unknown())).default([]),
  leadBehavior: z.string().nullable().optional(),
  screeningStatus: z.string(),
  screeningPriority: z.string().nullable().optional(),
  screeningNotes: z.string().nullable().optional(),
});

export const investorListDataSchema = z.object({
  items: z.array(investorSummarySchema),
});

export const investorRecentDealSchema = z
  .object({
    company: z.string().optional().nullable(),
    round: z.string().optional().nullable(),
    amount_text: z.string().optional().nullable(),
    amount: z.string().optional().nullable(),
    amount_currency: z.string().optional().nullable(),
    amount_value: z.number().optional().nullable(),
    role: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    direction: z.string().optional().nullable(),
    business_model: z.string().optional().nullable(),
    company_geography: z.string().optional().nullable(),
    investor_evidence_url: z.string().optional().nullable(),
  })
  .passthrough();

export const investorDetailSchema = investorSummarySchema.extend({
  linkedinUrl: z.string().nullable().optional(),
  founderFit: z.array(z.string()).default([]),
  aiAppetite: z.string().nullable().optional(),
  recentDeals: z.array(investorRecentDealSchema).default([]),
  entryChannels: z.array(z.string()).default([]),
  preferredChannel: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export type InvestorSummary = z.infer<typeof investorSummarySchema>;
export type InvestorListData = z.infer<typeof investorListDataSchema>;
export type InvestorRecentDeal = z.infer<typeof investorRecentDealSchema>;
export type InvestorDetail = z.infer<typeof investorDetailSchema>;

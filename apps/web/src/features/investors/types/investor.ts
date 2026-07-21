import { z } from "zod";

const nullableNumberSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}, z.number().optional().nullable());

const stringArraySchema = z.preprocess(
  (value) =>
    Array.isArray(value) ? value.filter((item) => typeof item === "string") : [],
  z.array(z.string()),
);

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
    amount_value: nullableNumberSchema,
    role: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    direction: z.string().optional().nullable(),
    actual_sector: z.string().optional().nullable(),
    sector_secondary: z.string().optional().nullable(),
    use_case_primary: z.string().optional().nullable(),
    use_case_secondary: z.array(z.unknown()).optional().nullable(),
    customer_type: z.string().optional().nullable(),
    business_model: z.string().optional().nullable(),
    sales_motion: z.string().optional().nullable(),
    technology_depth: z.string().optional().nullable(),
    ai_relevance: z.string().optional().nullable(),
    ai_usage_type: z.string().optional().nullable(),
    company_summary: z.string().optional().nullable(),
    confidence: z.string().optional().nullable(),
    company_geography: z.string().optional().nullable(),
    source_urls: stringArraySchema,
    investor_evidence_url: z.string().optional().nullable(),
  })
  .passthrough();

export const investorStagePreferenceSchema = z
  .object({
    stage: z.string().optional().nullable(),
    deals_count: nullableNumberSchema,
    deals_window_start: z.string().optional().nullable(),
    deals_window_end: z.string().optional().nullable(),
    lead_count: nullableNumberSchema,
    participant_count: nullableNumberSchema,
    leads_at_this_stage: z.boolean().optional().nullable(),
    cheque_size_min_usd: nullableNumberSchema,
    cheque_size_max_usd: nullableNumberSchema,
    cheque_size_confidence: z.string().optional().nullable(),
    recent_activity_score: nullableNumberSchema,
    actual_sector: z.array(z.string()).default([]),
    actual_themes: z.array(z.string()).default([]),
    dimension_distributions: z.record(z.string(), z.unknown()).optional().default({}),
    actual_archetypes: z.array(z.unknown()).optional().default([]),
    matching_notes: z.string().optional().nullable(),
    evidence_refs: z.array(z.record(z.string(), z.unknown())).default([]),
    data_quality: z.string().optional().nullable(),
    pipeline_version: z.string().optional().nullable(),
    generated_at: z.string().optional().nullable(),
  })
  .passthrough();

export const investorDetailSchema = investorSummarySchema.extend({
  linkedinUrl: z.string().nullable().optional(),
  founderFit: z.array(z.string()).default([]),
  aiAppetite: z.string().nullable().optional(),
  recentDeals: z.array(investorRecentDealSchema).default([]),
  entryChannels: z.array(z.string()).default([]),
  preferredChannel: z.string().nullable().optional(),
  stagePreferences: z.array(investorStagePreferenceSchema).default([]),
  totalDealsUsed: nullableNumberSchema,
  stageCoverage: z.record(z.string(), z.unknown()).optional().default({}),
  leadRatio: nullableNumberSchema,
  overallConfidence: nullableNumberSchema,
  activitySummary: z.string().nullable().optional(),
  dataQuality: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export type InvestorSummary = z.infer<typeof investorSummarySchema>;
export type InvestorListData = z.infer<typeof investorListDataSchema>;
export type InvestorRecentDeal = z.infer<typeof investorRecentDealSchema>;
export type InvestorStagePreference = z.infer<typeof investorStagePreferenceSchema>;
export type InvestorDetail = z.infer<typeof investorDetailSchema>;

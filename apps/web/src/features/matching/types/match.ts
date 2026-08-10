import { z } from "zod";

import { structuredIntakeValuesSchema } from "@/features/matching/types/structured-intake";

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

export const matchingWeightsSchema = z.object({
  stage_evidence_depth: z.number().int().min(0).max(100),
  geography_fit: z.number().int().min(0).max(100),
  sector_fit: z.number().int().min(0).max(100),
  theme_fit: z.number().int().min(0).max(100),
  recent_deal_similarity: z.number().int().min(0).max(100),
  customer_icp_fit: z.number().int().min(0).max(100),
  cheque_size_fit: z.number().int().min(0).max(100),
  lead_behavior_fit: z.number().int().min(0).max(100),
  data_quality_recency: z.number().int().min(0).max(100),
});

export const hardFilterSettingsSchema = z.object({
  stage: z.boolean(),
  geography: z.boolean(),
});

export const MIN_MATCH_RESULT_LIMIT = 10;
export const MAX_MATCH_RESULT_LIMIT = 30;
export const DEFAULT_MATCH_RESULT_LIMIT = 20;

export const INVESTOR_TYPE_VALUES = [
  "vc_fund",
  "angel",
  "angel_group",
  "family_office",
  "corporate_vc",
  "accelerator",
  "government_fund",
  "other",
] as const;

export const investorTypeSchema = z.enum(INVESTOR_TYPE_VALUES);
export type InvestorType = z.infer<typeof investorTypeSchema>;

export const INVESTOR_TYPE_LABELS: Record<InvestorType, string> = {
  vc_fund: "Venture capital funds",
  angel: "Individual angel investors",
  angel_group: "Angel groups",
  family_office: "Family offices",
  corporate_vc: "Corporate venture capital",
  accelerator: "Accelerators",
  government_fund: "Government-backed funds",
  other: "Other / unclassified investors",
};

export const matchingConfigurationSchema = z.object({
  weights: matchingWeightsSchema.refine(
    (weights) =>
      Object.values(weights).reduce((total, value) => total + value, 0) === 100,
    "Matching weights must total 100.",
  ),
  hard_filters: hardFilterSettingsSchema,
  result_limit: z
    .number()
    .int()
    .min(MIN_MATCH_RESULT_LIMIT)
    .max(MAX_MATCH_RESULT_LIMIT)
    .default(DEFAULT_MATCH_RESULT_LIMIT),
  excluded_investor_types: z.array(investorTypeSchema).max(8).default([]),
});

export const intakeRequestSchema = z.object({
  message: z.string().min(1),
  follow_up_answer: z.string().optional(),
  follow_up_count: z.number().int().min(0).max(1).optional(),
  matching_configuration: matchingConfigurationSchema.optional(),
  structured_intake: structuredIntakeValuesSchema.optional(),
});
export type IntakeRequest = z.infer<typeof intakeRequestSchema>;
export type MatchingWeights = z.infer<typeof matchingWeightsSchema>;
export type MatchingWeightKey = keyof MatchingWeights;
export type HardFilterSettings = z.infer<typeof hardFilterSettingsSchema>;
export type MatchingConfiguration = z.infer<typeof matchingConfigurationSchema>;

export const DEFAULT_MATCHING_CONFIGURATION: MatchingConfiguration = {
  weights: {
    stage_evidence_depth: 10,
    geography_fit: 5,
    sector_fit: 20,
    theme_fit: 20,
    recent_deal_similarity: 25,
    customer_icp_fit: 5,
    cheque_size_fit: 5,
    lead_behavior_fit: 5,
    data_quality_recency: 5,
  },
  hard_filters: {
    stage: true,
    geography: true,
  },
  result_limit: DEFAULT_MATCH_RESULT_LIMIT,
  excluded_investor_types: [],
};

export const matchEvidenceSchema = z.object({
  chunk_id: z.string().optional().nullable(),
  section_key: z.string().optional().nullable(),
  entity_type: z.string().optional().nullable(),
  entity_id: z.string().optional().nullable(),
  confidence: z.string().optional().nullable(),
  review_needed: z.boolean().optional().nullable(),
  retrieval_score: z.number().optional().nullable(),
  text_match: z.boolean().optional().nullable(),
  chunk_text: z.string(),
  source_urls: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const matchRecentDealSchema = z
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

export const matchStagePreferenceSchema = z
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

export const matchInvestorProfileSchema = z.object({
  investor_type: z.string().optional().nullable(),
  website_url: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  hq_country: z.string().optional().nullable(),
  hq_state: z.string().optional().nullable(),
  hq_city: z.string().optional().nullable(),
  stage_focus: z.array(z.string()).default([]),
  sector_focus: z.array(z.string()).default([]),
  geography_focus: z.array(z.string()).default([]),
  business_model_focus: z.array(z.string()).default([]),
  founder_fit: z.array(z.string()).default([]),
  cheque_ranges: z.array(z.record(z.string(), z.unknown())).default([]),
  declared_cheque_ranges: z.array(z.record(z.string(), z.unknown())).default([]),
  lead_behavior: z.string().optional().nullable(),
  ai_appetite: z.string().optional().nullable(),
  recent_deals: z.array(matchRecentDealSchema).default([]),
  entry_channels: z.array(z.string()).default([]),
  preferred_channel: z.string().optional().nullable(),
  warm_intro_available: z.boolean().optional().default(false),
  screening_status: z.string().optional().nullable(),
  screening_priority: z.string().optional().nullable(),
  screening_notes: z.string().optional().nullable(),
  stage_preferences: z.array(matchStagePreferenceSchema).default([]),
  total_deals_used: nullableNumberSchema,
  stage_coverage: z.record(z.string(), z.unknown()).optional().default({}),
  lead_ratio: nullableNumberSchema,
  overall_confidence: nullableNumberSchema,
  activity_summary: z.string().optional().nullable(),
  data_quality: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

export const matchEligibilitySchema = z.object({
  passed: z.boolean().default(true),
  hard_filter_reasons: z.array(z.string()).default([]),
  soft_warnings: z.array(z.string()).default([]),
});

export const matchCapacityEstimateSchema = z.object({
  role: z.enum(["lead_candidate", "participant"]),
  tier: z.string(),
  conversion_factor: z.number(),
  selection_probability: z.number(),
  planning_cheque: z.number(),
  risk_adjusted_amount: z.number(),
  currency: z.string(),
  cheque_source: z.enum(["investor_record", "stage_type_prior"]),
  counted: z.boolean(),
});

// Optional: /api/matching/history persists whole IntakeResponse payloads, so
// records saved before this field existed won't have it.
export const matchContextSchema = z.object({
  matched_stage: z.string().optional().nullable(),
  stage_match_reason: z.string().optional().nullable(),
  sector_matches: z.array(z.string()).default([]),
  theme_matches: z.array(z.string()).default([]),
  comparable_deals: z.array(z.string()).default([]),
});

export const matchResultSchema = z.object({
  investor_id: z.string(),
  investor_name: z.string(),
  score: z.number(),
  raw_score: z.number().optional(),
  normalized_score: z.number().optional(),
  assessable_points: z.number().optional(),
  confidence: z.string().optional().nullable(),
  missing_evidence: z.array(z.string()).default([]),
  theme_evidence: z.record(z.string(), z.unknown()).optional(),
  rank: z.number().optional().nullable(),
  pool_rank: z.number().optional().nullable(),
  match_tier: z.string().optional().nullable(),
  routing_pool: z.string().default("direct_vc_pool"),
  routing_pool_label: z.string().default("Best direct investors"),
  eligibility: matchEligibilitySchema.optional(),
  breakdown: z.record(z.string(), z.number()).default({}),
  base_breakdown: z.record(z.string(), z.number()).optional(),
  scoring_weights: z.record(z.string(), z.number()).optional(),
  hard_filters: hardFilterSettingsSchema.optional(),
  strengths: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  review_needed_fields: z.array(z.string()).default([]),
  evidence: z.array(matchEvidenceSchema).default([]),
  investor_profile: matchInvestorProfileSchema.optional(),
  match_context: matchContextSchema.optional(),
  capacity_estimate: matchCapacityEstimateSchema.optional(),
});

export const investmentCapacityTierSchema = z.object({
  tier: z.string(),
  candidate_count: z.number().int().nonnegative(),
  base_conversion_factor: z.number().min(0).max(1),
});

export const investmentCapacitySchema = z.object({
  model_version: z.string(),
  currency: z.string(),
  target_amount: z.number().nonnegative(),
  committed_amount: z.number().nonnegative(),
  remaining_target: z.number().nonnegative(),
  gross_capacity: z.number().nonnegative(),
  risk_adjusted_capacity: z.number().nonnegative(),
  coverage_buffer_multiplier: z.number().positive(),
  required_gross_capacity: z.number().nonnegative(),
  coverage_buffer_met: z.boolean(),
  risk_adjusted_coverage_met: z.boolean(),
  candidate_count: z.number().int().nonnegative(),
  participant_candidate_count: z.number().int().nonnegative(),
  lead_needed: z.boolean(),
  lead_candidate_count: z.number().int().nonnegative(),
  lead_probability: z.number().min(0).max(1),
  lead_probability_threshold: z.number().min(0).max(1),
  lead_requirement_met: z.boolean(),
  tier_breakdown: z.array(investmentCapacityTierSchema),
  is_enough: z.boolean(),
  assumption_note: z.string(),
});

export const intakeResponseSchema = z.object({
  status: z.enum(["needs_follow_up", "matched", "matched_with_missing_information"]),
  parsed_company_profile: z.record(z.string(), z.unknown()),
  missing_fields: z.array(z.string()),
  follow_up_question: z.string().nullable(),
  follow_up_count: z.number(),
  matches: z.array(matchResultSchema),
  investment_capacity: investmentCapacitySchema.optional().nullable(),
});

export const fileExtractionResponseSchema = z.object({
  file_name: z.string(),
  content_type: z.string().nullable(),
  extension: z.string(),
  text: z.string(),
  character_count: z.number(),
  truncated: z.boolean(),
});

export const matchRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  response: intakeResponseSchema,
  matchingConfiguration: matchingConfigurationSchema.nullable(),
  structuredIntake: structuredIntakeValuesSchema.nullable(),
});

export const runMatchDataSchema = z.object({
  response: intakeResponseSchema,
  record: matchRecordSchema.nullable(),
});

export const matchHistoryListDataSchema = z.object({
  items: z.array(matchRecordSchema),
});

export type MatchEvidence = z.infer<typeof matchEvidenceSchema>;
export type MatchRecentDeal = z.infer<typeof matchRecentDealSchema>;
export type MatchStagePreference = z.infer<typeof matchStagePreferenceSchema>;
export type MatchInvestorProfile = z.infer<typeof matchInvestorProfileSchema>;
export type MatchEligibility = z.infer<typeof matchEligibilitySchema>;
export type MatchContext = z.infer<typeof matchContextSchema>;
export type MatchCapacityEstimate = z.infer<typeof matchCapacityEstimateSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type InvestmentCapacity = z.infer<typeof investmentCapacitySchema>;
export type IntakeResponse = z.infer<typeof intakeResponseSchema>;
export type FileExtractionResponse = z.infer<typeof fileExtractionResponseSchema>;
export type MatchRecord = z.infer<typeof matchRecordSchema>;
export type RunMatchData = z.infer<typeof runMatchDataSchema>;
export type MatchHistoryListData = z.infer<typeof matchHistoryListDataSchema>;

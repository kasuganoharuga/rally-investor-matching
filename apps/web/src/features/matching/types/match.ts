import { z } from "zod";

export const intakeRequestSchema = z.object({
  message: z.string().min(1),
  follow_up_answer: z.string().optional(),
  follow_up_count: z.number().int().min(0).max(1).optional(),
});
export type IntakeRequest = z.infer<typeof intakeRequestSchema>;

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
    amount_value: z.number().optional().nullable(),
    role: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    direction: z.string().optional().nullable(),
    business_model: z.string().optional().nullable(),
    company_geography: z.string().optional().nullable(),
    investor_evidence_url: z.string().optional().nullable(),
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
  lead_behavior: z.string().optional().nullable(),
  ai_appetite: z.string().optional().nullable(),
  recent_deals: z.array(matchRecentDealSchema).default([]),
  entry_channels: z.array(z.string()).default([]),
  preferred_channel: z.string().optional().nullable(),
  warm_intro_available: z.boolean().optional().default(false),
  screening_status: z.string().optional().nullable(),
  screening_priority: z.string().optional().nullable(),
  screening_notes: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

export const matchEligibilitySchema = z.object({
  passed: z.boolean().default(true),
  hard_filter_reasons: z.array(z.string()).default([]),
  soft_warnings: z.array(z.string()).default([]),
});

export const matchResultSchema = z.object({
  investor_id: z.string(),
  investor_name: z.string(),
  score: z.number(),
  rank: z.number().optional().nullable(),
  pool_rank: z.number().optional().nullable(),
  match_tier: z.string().optional().nullable(),
  routing_pool: z.string().default("direct_vc_pool"),
  routing_pool_label: z.string().default("Best direct investors"),
  eligibility: matchEligibilitySchema.optional(),
  breakdown: z.record(z.string(), z.number()).default({}),
  strengths: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  review_needed_fields: z.array(z.string()).default([]),
  evidence: z.array(matchEvidenceSchema).default([]),
  investor_profile: matchInvestorProfileSchema.optional(),
});

export const intakeResponseSchema = z.object({
  status: z.enum(["needs_follow_up", "matched", "matched_with_missing_information"]),
  parsed_company_profile: z.record(z.string(), z.unknown()),
  missing_fields: z.array(z.string()),
  follow_up_question: z.string().nullable(),
  follow_up_count: z.number(),
  matches: z.array(matchResultSchema),
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
export type MatchInvestorProfile = z.infer<typeof matchInvestorProfileSchema>;
export type MatchEligibility = z.infer<typeof matchEligibilitySchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type IntakeResponse = z.infer<typeof intakeResponseSchema>;
export type FileExtractionResponse = z.infer<typeof fileExtractionResponseSchema>;
export type MatchRecord = z.infer<typeof matchRecordSchema>;
export type RunMatchData = z.infer<typeof runMatchDataSchema>;
export type MatchHistoryListData = z.infer<typeof matchHistoryListDataSchema>;

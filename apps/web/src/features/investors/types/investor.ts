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

export type InvestorSummary = z.infer<typeof investorSummarySchema>;
export type InvestorListData = z.infer<typeof investorListDataSchema>;

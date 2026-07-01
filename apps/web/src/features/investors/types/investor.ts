import { z } from "zod";

export const SCREENING_STATUS = {
  UNSCREENED: "unscreened",
  SCREENED: "screened",
  PRIORITY: "priority",
} as const;

export const investorSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string().nullable(),
  investorType: z.string().nullable(),
  hqCountry: z.string().nullable(),
  stageFocus: z.array(z.string()),
  screeningStatus: z.string(),
});

export const investorListDataSchema = z.object({
  items: z.array(investorSummarySchema),
});

export type InvestorSummary = z.infer<typeof investorSummarySchema>;
export type InvestorListData = z.infer<typeof investorListDataSchema>;

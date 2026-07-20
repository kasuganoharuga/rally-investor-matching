import { z } from "zod";

import { investorSummarySchema } from "@/features/investors/types/investor";

export const shortlistSourceSchema = z.enum([
  "manual",
  "investor_directory",
  "investor_profile",
  "match_detail",
  "vc_profile",
]);

export const addShortlistInputSchema = z.object({
  investorId: z.string().min(1),
  source: shortlistSourceSchema.optional().default("manual"),
});

export const shortlistItemSchema = z.object({
  id: z.string().min(1),
  investor: investorSummarySchema,
  source: shortlistSourceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const shortlistListDataSchema = z.object({
  items: z.array(shortlistItemSchema),
});

export const shortlistItemDataSchema = z.object({
  item: shortlistItemSchema,
});

export const removeShortlistDataSchema = z.object({
  investorId: z.string().min(1),
});

export type ShortlistSource = z.infer<typeof shortlistSourceSchema>;
export type AddShortlistInput = z.infer<typeof addShortlistInputSchema>;
export type ShortlistItem = z.infer<typeof shortlistItemSchema>;
export type ShortlistListData = z.infer<typeof shortlistListDataSchema>;
export type ShortlistItemData = z.infer<typeof shortlistItemDataSchema>;
export type RemoveShortlistData = z.infer<typeof removeShortlistDataSchema>;

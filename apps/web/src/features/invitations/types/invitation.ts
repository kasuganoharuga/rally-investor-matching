import { z } from "zod";

import { userRoleSchema } from "@/features/auth/types/auth";

export const invitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
  "revoked",
]);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const createInvitationInputSchema = z.object({
  email: z.string().email(),
  role: userRoleSchema.optional(),
});
export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;

/**
 * Deliberately excludes `token` (internal audit value, never leaves the
 * server) and `temporaryPassword` (only ever goes out through the email
 * provider, never through this API).
 */
export const invitationSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  role: userRoleSchema,
  status: invitationStatusSchema,
  invitedBy: z.string().nullable(),
  acceptedBy: z.string().nullable(),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InvitationSummary = z.infer<typeof invitationSummarySchema>;

export const invitationListDataSchema = z.object({
  items: z.array(invitationSummarySchema),
});
export type InvitationListData = z.infer<typeof invitationListDataSchema>;

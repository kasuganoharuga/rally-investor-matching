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

export const acceptInvitationInputSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationInputSchema>;

/**
 * Deliberately excludes `token` (internal audit value, never leaves the
 * server).
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

export const publicInvitationSchema = z.object({
  email: z.string(),
  role: userRoleSchema,
  expiresAt: z.string(),
});
export type PublicInvitation = z.infer<typeof publicInvitationSchema>;

export const acceptedInvitationSchema = z.object({
  email: z.string(),
  role: userRoleSchema,
});
export type AcceptedInvitation = z.infer<typeof acceptedInvitationSchema>;

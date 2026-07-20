import { apiFetch } from "@/lib/api/client";
import {
  invitationListDataSchema,
  invitationSummarySchema,
  acceptedInvitationSchema,
  type AcceptedInvitation,
  type AcceptInvitationInput,
  type CreateInvitationInput,
  type InvitationListData,
  type InvitationSummary,
} from "@/features/invitations/types/invitation";

export async function listInvitations(): Promise<InvitationListData> {
  const data = await apiFetch<InvitationListData>("/api/invitations");
  return invitationListDataSchema.parse(data);
}

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<InvitationSummary> {
  const data = await apiFetch<InvitationSummary>("/api/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return invitationSummarySchema.parse(data);
}

export async function acceptInvitation(
  input: AcceptInvitationInput,
): Promise<AcceptedInvitation> {
  const data = await apiFetch<AcceptedInvitation>("/api/invitations/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return acceptedInvitationSchema.parse(data);
}

export async function revokeInvitation(id: string): Promise<void> {
  await apiFetch<{ status: string }>(`/api/invitations/${id}`, {
    method: "DELETE",
  });
}

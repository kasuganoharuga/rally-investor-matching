import type { NextRequest } from "next/server";

import { requireInviter } from "@/features/auth/server/session";
import { invitationService } from "@/features/invitations/server/services/invitation-service";
import { createInvitationInputSchema } from "@/features/invitations/types/invitation";
import { parseJsonBody } from "@/lib/api/request";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async () => {
  const viewer = await requireInviter();
  const items = await invitationService.listForViewer(viewer);
  return jsonSuccess({ items });
});

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const inviter = await requireInviter();
  const input = await parseJsonBody(request, createInvitationInputSchema);
  const invitation = await invitationService.createInvitation(input, inviter);
  return jsonSuccess(invitation, { status: 201 });
});

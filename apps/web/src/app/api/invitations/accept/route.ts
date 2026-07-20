import type { NextRequest } from "next/server";

import { invitationService } from "@/features/invitations/server/services/invitation-service";
import { acceptInvitationInputSchema } from "@/features/invitations/types/invitation";
import { parseJsonBody } from "@/lib/api/request";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const input = await parseJsonBody(request, acceptInvitationInputSchema);
  const accepted = await invitationService.acceptInvitation(input);
  return jsonSuccess(accepted);
});

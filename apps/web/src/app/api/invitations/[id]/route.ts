import type { NextRequest } from "next/server";

import { requireInviter } from "@/features/auth/server/session";
import { invitationService } from "@/features/invitations/server/services/invitation-service";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const DELETE = withApiErrorHandling(
  async (_request: NextRequest, context: RouteContext) => {
    const inviter = await requireInviter();
    const { id } = await context.params;
    const status = await invitationService.revokeInvitation(id, inviter);
    // Keep the { data: ... } envelope (instead of a bare 204) so the
    // shared apiFetch client can parse every response the same way.
    return jsonSuccess({ status });
  },
);

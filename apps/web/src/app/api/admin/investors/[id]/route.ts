import type { NextRequest } from "next/server";

import { requireInviter } from "@/features/auth/server/session";
import { investorManagementService } from "@/features/investor-management/server/services/investor-management-service";
import { updateInvestorReviewSchema } from "@/features/investor-management/types/investor-management";
import { parseJsonBody } from "@/lib/api/request";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withApiErrorHandling(
  async (request: NextRequest, context: RouteContext) => {
    const reviewer = await requireInviter();
    const { id } = await context.params;
    const input = await parseJsonBody(request, updateInvestorReviewSchema);
    const investor = await investorManagementService.updateReview(
      id,
      reviewer.id,
      input,
    );
    return jsonSuccess(investor);
  },
);

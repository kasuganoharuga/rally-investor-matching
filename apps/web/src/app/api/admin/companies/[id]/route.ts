import type { NextRequest } from "next/server";

import { requireInviter } from "@/features/auth/server/session";
import { companyManagementService } from "@/features/company-management/server/services/company-management-service";
import { companyProfileInputSchema } from "@/features/company-profile/types/company-profile";
import { parseJsonBody } from "@/lib/api/request";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const PUT = withApiErrorHandling(
  async (request: NextRequest, context: RouteContext) => {
    await requireInviter();
    const { id } = await context.params;
    const input = await parseJsonBody(request, companyProfileInputSchema);
    const company = await companyManagementService.updateCompany(id, input);
    return jsonSuccess(company);
  },
);

import { requireInviter } from "@/features/auth/server/session";
import { investorManagementService } from "@/features/investor-management/server/services/investor-management-service";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async () => {
  await requireInviter();
  const items = await investorManagementService.listInvestors();
  return jsonSuccess({ items });
});

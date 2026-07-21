import { requireInviter } from "@/features/auth/server/session";
import { companyManagementService } from "@/features/company-management/server/services/company-management-service";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async () => {
  await requireInviter();
  const items = await companyManagementService.listCompanies();
  return jsonSuccess({ items });
});

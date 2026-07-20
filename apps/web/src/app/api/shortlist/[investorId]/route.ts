import { requireUser } from "@/features/auth/server/session";
import { shortlistService } from "@/features/shortlist/server/services/shortlist-service";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ investorId: string }> };

export const DELETE = withApiErrorHandling(async (_request, context: RouteContext) => {
  const user = await requireUser();
  const { investorId } = await context.params;
  const data = await shortlistService.remove(decodeURIComponent(investorId), user);
  return jsonSuccess(data);
});

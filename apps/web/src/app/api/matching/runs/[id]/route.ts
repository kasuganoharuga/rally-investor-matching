import { requireUser } from "@/features/auth/server/session";
import { matchingHistoryService } from "@/features/matching/server/services/matching-history-service";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withApiErrorHandling(async (_request, context: RouteContext) => {
  const user = await requireUser();
  const { id } = await context.params;
  const data = await matchingHistoryService.getRun(id, user);
  return jsonSuccess(data);
});

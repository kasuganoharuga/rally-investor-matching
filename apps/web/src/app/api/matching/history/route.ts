import { requireUser } from "@/features/auth/server/session";
import { matchingHistoryService } from "@/features/matching/server/services/matching-history-service";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async () => {
  const user = await requireUser();
  const data = await matchingHistoryService.listHistory(user);
  return jsonSuccess(data);
});

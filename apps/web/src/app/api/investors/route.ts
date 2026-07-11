import { investorService } from "@/features/investors/server/services/investor-service";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const GET = withApiErrorHandling(async () => {
  const data = await investorService.listSummaries();
  return jsonSuccess(data);
});

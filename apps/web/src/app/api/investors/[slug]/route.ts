import { investorService } from "@/features/investors/server/services/investor-service";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

type RouteContext = { params: Promise<{ slug: string }> };

export const GET = withApiErrorHandling(async (_request, context: RouteContext) => {
  const { slug } = await context.params;
  const data = await investorService.getDetail(slug);
  return jsonSuccess(data);
});

import { investorService } from "@/features/investors/server/services/investor-service";
import { jsonFromApiError, jsonSuccess } from "@/lib/api/server-response";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const data = await investorService.getDetail(slug);
    return jsonSuccess(data);
  } catch (error) {
    return jsonFromApiError(error);
  }
}

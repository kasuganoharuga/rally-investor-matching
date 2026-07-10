import { investorService } from "@/features/investors/server/services/investor-service";
import { jsonFromApiError, jsonSuccess } from "@/lib/api/server-response";

export async function GET() {
  try {
    const data = await investorService.listSummaries();
    return jsonSuccess(data);
  } catch (error) {
    return jsonFromApiError(error);
  }
}

import type { NextRequest } from "next/server";

import { requireUser } from "@/features/auth/server/session";
import { matchingHistoryService } from "@/features/matching/server/services/matching-history-service";
import { intakeRequestSchema } from "@/features/matching/types/match";
import { parseJsonBody } from "@/lib/api/request";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const input = await parseJsonBody(request, intakeRequestSchema);
  const data = await matchingHistoryService.runIntake(input, user);
  return jsonSuccess(data);
});

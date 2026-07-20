import type { NextRequest } from "next/server";

import { requireUser } from "@/features/auth/server/session";
import { shortlistService } from "@/features/shortlist/server/services/shortlist-service";
import { addShortlistInputSchema } from "@/features/shortlist/types/shortlist";
import { parseJsonBody } from "@/lib/api/request";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async () => {
  const user = await requireUser();
  const data = await shortlistService.list(user);
  return jsonSuccess(data);
});

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const input = await parseJsonBody(request, addShortlistInputSchema);
  const data = await shortlistService.add(input, user);
  return jsonSuccess(data);
});

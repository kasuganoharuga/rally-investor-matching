import type { NextRequest } from "next/server";

import { requireUser } from "@/features/auth/server/session";
import { userProfileService } from "@/features/settings/server/services/user-profile-service";
import { userProfileInputSchema } from "@/features/settings/types/user-profile";
import { parseJsonBody } from "@/lib/api/request";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async () => {
  const user = await requireUser();
  const profile = await userProfileService.getForUser(user);
  return jsonSuccess(profile);
});

export const PUT = withApiErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const input = await parseJsonBody(request, userProfileInputSchema);
  const profile = await userProfileService.upsertForUser(user, input);
  return jsonSuccess(profile);
});

import type { NextRequest } from "next/server";

import { requireFounder } from "@/features/auth/server/session";
import { companyProfileService } from "@/features/company-profile/server/services/company-profile-service";
import { companyProfileInputSchema } from "@/features/company-profile/types/company-profile";
import { parseJsonBody } from "@/lib/api/request";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async () => {
  const user = await requireFounder();
  const profile = await companyProfileService.getForOwner(user);
  return jsonSuccess(profile);
});

export const PUT = withApiErrorHandling(async (request: NextRequest) => {
  const user = await requireFounder();
  const input = await parseJsonBody(request, companyProfileInputSchema);
  const profile = await companyProfileService.upsertForOwner(user, input);
  return jsonSuccess(profile);
});

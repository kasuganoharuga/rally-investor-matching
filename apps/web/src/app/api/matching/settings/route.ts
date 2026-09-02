import type { NextRequest } from "next/server";

import { requireUser } from "@/features/auth/server/session";
import { matchingSettingsService } from "@/features/matching/server/services/matching-settings-service";
import {
  resetMatchingSettingsSchema,
  saveMatchingSettingsSchema,
} from "@/features/matching/types/matching-settings";
import { parseJsonBody } from "@/lib/api/request";
import { assertSameOriginJsonRequest } from "@/lib/api/request-security";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const GET = withApiErrorHandling(async () => {
  return jsonSuccess(await matchingSettingsService.getForUser(await requireUser()));
});

export const PUT = withApiErrorHandling(async (request: NextRequest) => {
  assertSameOriginJsonRequest(request);
  const user = await requireUser();
  const input = await parseJsonBody(request, saveMatchingSettingsSchema, 16_384);
  return jsonSuccess(await matchingSettingsService.save(user, input));
});

export const DELETE = withApiErrorHandling(async (request: NextRequest) => {
  assertSameOriginJsonRequest(request);
  const user = await requireUser();
  const input = await parseJsonBody(request, resetMatchingSettingsSchema, 16_384);
  return jsonSuccess(await matchingSettingsService.resetPersonal(user, input));
});

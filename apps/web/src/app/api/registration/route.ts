import type { NextRequest } from "next/server";

import {
  assertRegistrationOrigin,
  checkRegistrationRateLimit,
} from "@/features/auth/server/registration-security";
import { registerFounder } from "@/features/auth/server/registration-service";
import { registrationInputSchema } from "@/features/auth/types/registration";
import { parseJsonBody } from "@/lib/api/request";
import { withApiErrorHandling } from "@/lib/api/route-handler";
import { jsonSuccess } from "@/lib/api/server-response";

export const runtime = "nodejs";

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  assertRegistrationOrigin(request);
  const input = await parseJsonBody(request, registrationInputSchema, 16_384);
  await checkRegistrationRateLimit(request, input.email);
  return jsonSuccess(await registerFounder(input));
});

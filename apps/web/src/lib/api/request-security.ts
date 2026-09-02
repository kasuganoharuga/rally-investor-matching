import "server-only";

import { ApiError } from "@/lib/api/errors";

/** Cookie-authenticated writes must be same-origin JSON, not form/text CSRF. */
export function assertSameOriginJsonRequest(request: Request): void {
  const configuredUrl = process.env.APP_BASE_URL ?? process.env.BETTER_AUTH_URL;
  const expectedOrigin = new URL(configuredUrl ?? request.url).origin;
  const origin = request.headers.get("origin");
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (origin !== expectedOrigin) {
    throw new ApiError({
      code: "FORBIDDEN_ORIGIN",
      message: "This request must come from Rally.",
      status: 403,
    });
  }
  if (contentType !== "application/json") {
    throw new ApiError({
      code: "UNSUPPORTED_CONTENT_TYPE",
      message: "Request body must use application/json.",
      status: 415,
    });
  }
}

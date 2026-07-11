import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/features/auth/server/auth";

// Better Auth needs real Node APIs (pg pool, crypto); it cannot run on
// the Edge runtime.
export const runtime = "nodejs";

// Better Auth manages its own request/response format here, so this
// route is intentionally not wrapped with withApiErrorHandling.
export const { GET, POST } = toNextJsHandler(auth);

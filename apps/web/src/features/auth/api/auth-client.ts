import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@/features/auth/server/auth";

// No explicit baseURL: the client defaults to same-origin, which is
// correct here since /api/auth/* is served by this same Next.js app.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

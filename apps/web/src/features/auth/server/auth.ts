import "server-only";

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

import { getProvisioningContext } from "@/features/auth/server/provisioning-context";
import { userRoleSchema, type UserRole } from "@/features/auth/types/auth";
import { getPool } from "@/lib/server/db";

const DEFAULT_USER_ROLE: UserRole = "founder";

/**
 * Better Auth instance. Registration is invite-only: the only path that
 * is allowed to create a user is provisionUser() calling
 * `auth.api.signUpEmail()` directly (no `request`), which hooks.before
 * below distinguishes from a public HTTP POST to the same endpoint.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: getPool(),
  emailAndPassword: {
    enabled: true,
    // provisionUser() runs server-side on behalf of an inviter, not the
    // person signing in — it must never leave a live session behind.
    autoSignIn: false,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        // Never trust a client-supplied role; only databaseHooks below
        // (fed from provisioning-context, not the request body) sets it.
        input: false,
        defaultValue: DEFAULT_USER_ROLE,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          const context = getProvisioningContext();
          const role = context?.role ?? DEFAULT_USER_ROLE;
          return { data: { role: userRoleSchema.parse(role) } };
        },
        after: async (user) => {
          const context = getProvisioningContext();
          if (context) {
            context.createdUserId = user.id;
          }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && ctx.request) {
        // `ctx.request` is only set for requests that came in over HTTP;
        // provisionUser()'s direct auth.api.signUpEmail() call has none.
        throw new APIError("FORBIDDEN", {
          message:
            "Public registration is disabled. Ask an admin or reviewer for an invitation.",
        });
      }
    }),
  },
});

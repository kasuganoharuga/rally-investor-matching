import "server-only";

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

import { getProvisioningContext } from "@/features/auth/server/provisioning-context";
import { userRoleSchema, type UserRole } from "@/features/auth/types/auth";
import { getPool } from "@/lib/server/db";
import { getEmailProvider } from "@/lib/server/email/get-email-provider";
import { logger } from "@/lib/server/logger";

const DEFAULT_USER_ROLE: UserRole = "founder";

/**
 * Better Auth instance. Invitations and validated public founder registration
 * create users via provisionUser() calling
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
    // Public founder registration must confirm the inbox exists before the
    // account can sign in. Invited users are exempted below (their email
    // is already proven via the invitation link) by pre-marking them
    // verified, not by disabling this globally.
    requireEmailVerification: true,
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
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Invited users already proved ownership of their inbox by opening
      // the tokenized invitation link — they're created pre-verified
      // (see databaseHooks below) and must not get a second, redundant
      // "confirm your email" message.
      if (getProvisioningContext()?.invitedBy) return;
      try {
        await getEmailProvider().sendVerification({ to: user.email, verifyUrl: url });
      } catch {
        logger.error("verification_email_failed", { userId: user.id });
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          const context = getProvisioningContext();
          const role = context?.role ?? DEFAULT_USER_ROLE;
          return {
            data: {
              role: userRoleSchema.parse(role),
              // Invitation acceptance itself proves inbox ownership (the
              // invitee had to open a tokenized link sent to that
              // address), so invited accounts skip the separate
              // verification-email step public registration requires.
              emailVerified: Boolean(context?.invitedBy),
            },
          };
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
            "Use the Rally registration form or your invitation link to create an account.",
        });
      }
    }),
  },
});

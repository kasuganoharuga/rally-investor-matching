import "server-only";

import { auth } from "@/features/auth/server/auth";
import {
  isProvisionUserError,
  ProvisionUserError,
} from "@/features/auth/server/errors";
import { generateTemporaryPassword } from "@/features/auth/server/password";
import {
  withProvisioningContext,
  type ProvisioningContext,
} from "@/features/auth/server/provisioning-context";
import {
  deleteUserById,
  findUserByEmail,
  findUserById,
} from "@/features/auth/server/repositories/user-repository";
import { userRoleSchema, type UserRole } from "@/features/auth/types/auth";
import { getPool, type Queryable } from "@/lib/server/db";
import { normalizeEmail } from "@/lib/server/normalize-email";

export type ProvisionUserInput = {
  email: string;
  role?: UserRole;
  invitedBy?: string;
  password?: string;
};

export type ProvisionedUser = {
  userId: string;
  email: string;
  temporaryPassword: string;
};

/**
 * The only path that is allowed to create a user in this app. Runs
 * server-side sign-up through Better Auth, then verifies — using our
 * own query, not Better Auth's response — that the user really was
 * persisted before treating it as a success.
 *
 * On failure, distinguishes three outcomes instead of two:
 *  - confirmed never created -> safe to rethrow the original error;
 *  - confirmed created by this call -> cleans it up, then rethrows;
 *  - anything else (no hook evidence either way) -> PROVISIONING_RESULT_UNCERTAIN,
 *    because the absence of `createdUserId` never proves the user wasn't
 *    created (the after-hook itself could have failed to run).
 */
export async function provisionUser(
  input: ProvisionUserInput,
): Promise<ProvisionedUser> {
  const email = normalizeEmail(input.email);
  const role = userRoleSchema.parse(input.role ?? "founder");
  const password = input.password ?? generateTemporaryPassword();

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new ProvisionUserError("EMAIL_ALREADY_EXISTS");
  }

  const context: ProvisioningContext = { role, invitedBy: input.invitedBy };

  try {
    // Every user's `name` column is just their email — this app has no
    // display-name field or UI to edit one, so there is nothing else it
    // could legitimately hold.
    const result = await withProvisioningContext(context, () =>
      auth.api.signUpEmail({
        body: { email, name: email, password },
      }),
    );

    const persistedUser = await findUserById(result.user.id);
    if (
      !persistedUser ||
      persistedUser.id !== context.createdUserId ||
      normalizeEmail(persistedUser.email) !== email
    ) {
      throw new ProvisionUserError("USER_NOT_PERSISTED");
    }

    return { userId: persistedUser.id, email, temporaryPassword: password };
  } catch (error) {
    if (context.createdUserId) {
      // Hook evidence confirms this call created the row — safe to clean
      // up the account it (and only it) is responsible for.
      await cleanupFreshProvisionedUser({
        userId: context.createdUserId,
        email,
      });
      throw error;
    }

    // No hook evidence, but that does NOT prove nothing was created: the
    // after-hook could itself have failed to run after the row was
    // inserted. Re-check by email before treating this as a clean failure.
    try {
      const possibleUser = await findUserByEmail(email);
      if (possibleUser) {
        // A user now exists, but we cannot prove this call created it
        // (could also be a concurrent registration) — do not delete it.
        throw new ProvisionUserError("PROVISIONING_RESULT_UNCERTAIN");
      }
    } catch (verificationError) {
      if (isProvisionUserError(verificationError, "PROVISIONING_RESULT_UNCERTAIN")) {
        throw verificationError;
      }
      // The re-check query itself failed — equally uncertain.
      throw new ProvisionUserError("PROVISIONING_RESULT_UNCERTAIN", 500, {
        cause: verificationError,
      });
    }

    // Re-queried by email and confirmed no user exists: the original
    // error can safely be treated as "nothing was created".
    throw error;
  }
}

/**
 * Deletes a user this process just created and confirms the delete
 * actually took effect. Any failure along the way — connection error,
 * the re-check itself failing, or the user still existing afterwards —
 * is folded into PROVISIONING_CLEANUP_FAILED, because the caller's only
 * safe response to "cleanup didn't verifiably work" is the same either
 * way: stop and require reconciliation.
 *
 * Accepts an optional transactional client so callers holding a row
 * lock (see safelyCleanupPendingProvisioning) can run this on the same
 * connection instead of a second, unsynchronized one.
 */
export async function cleanupFreshProvisionedUser(
  input: { userId: string; email: string },
  client: Queryable = getPool(),
): Promise<void> {
  try {
    await deleteUserById({ id: input.userId, email: input.email }, client);
    const remaining = await findUserById(input.userId, client);
    if (remaining) {
      throw new Error("User still exists after cleanup");
    }
  } catch (cause) {
    throw new ProvisionUserError("PROVISIONING_CLEANUP_FAILED", 500, {
      cause,
    });
  }
}

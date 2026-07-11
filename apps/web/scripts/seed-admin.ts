/**
 * Idempotent admin bootstrap. Safe to run any number of times:
 *  1. no user with this email yet          -> provision it fresh
 *  2. user exists, has no login credential -> already bootstrapped once
 *     but never got a credential; recreate it via provisionUser so
 *     Better Auth's own hashing/lifecycle code runs, not a hand-rolled
 *     copy of it
 *  3. user exists and already has a credential -> nothing to do
 *  4. user exists, no credential, but is referenced elsewhere (e.g. as
 *     an inviter) -> refuse; deleting it would either fail or silently
 *     orphan those references, so this needs a human decision
 *
 * Imports every module that reads env vars (DATABASE_URL,
 * BETTER_AUTH_SECRET, ...) dynamically, so seed-admin-password.ts can
 * load .env.local first — a static top-level import would evaluate
 * before that happens.
 */

const ADMIN_EMAIL = "admin@rally.local";

export async function runAdminSeed(): Promise<void> {
  const { normalizeEmail } = await import("../src/lib/server/normalize-email");
  const { getPool, isPostgresError } = await import("../src/lib/server/db");
  const { provisionUser } = await import("../src/features/auth/server/provision-user");
  const { deleteUserById, findUserByEmail, hasCredentialAccount } =
    await import("../src/features/auth/server/repositories/user-repository");

  const email = normalizeEmail(ADMIN_EMAIL);
  const pool = getPool();
  const existingUser = await findUserByEmail(email, pool);

  if (!existingUser) {
    const provisioned = await provisionUser({
      email,
      role: "admin",
    });
    logResult("Created", provisioned);
    return;
  }

  if (await hasCredentialAccount(existingUser.id, pool)) {
    console.log(`Admin account ${email} already has login credentials; nothing to do.`);
    return;
  }

  try {
    await deleteUserById({ id: existingUser.id, email }, pool);
  } catch (error) {
    if (isPostgresError(error) && error.code === "23503") {
      throw new Error(
        `Admin user ${email} (${existingUser.id}) has no login credentials ` +
          "but is referenced by other records, so it cannot be safely " +
          "deleted and recreated automatically. Resolve those references " +
          "manually, then re-run this script.",
      );
    }
    throw error;
  }

  const provisioned = await provisionUser({
    email,
    role: "admin",
  });
  logResult("Recreated", provisioned);
}

function logResult(
  action: "Created" | "Recreated",
  provisioned: { email: string; temporaryPassword: string },
): void {
  console.log(`${action} admin account: ${provisioned.email}`);
  console.log(`Temporary password: ${provisioned.temporaryPassword}`);
  console.log("Sign in and change this password immediately.");
}

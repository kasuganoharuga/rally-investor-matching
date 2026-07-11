import "server-only";

import { getPool, type Queryable } from "@/lib/server/db";

export type AuthUserRecord = {
  id: string;
  email: string;
};

export async function findUserByEmail(
  email: string,
  client: Queryable = getPool(),
): Promise<AuthUserRecord | null> {
  const result = await client.query(
    `SELECT id, email FROM "user" WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  );
  return (result.rows[0] as AuthUserRecord | undefined) ?? null;
}

export async function findUserById(
  id: string,
  client: Queryable = getPool(),
): Promise<AuthUserRecord | null> {
  const result = await client.query(
    `SELECT id, email FROM "user" WHERE id = $1 LIMIT 1`,
    [id],
  );
  return (result.rows[0] as AuthUserRecord | undefined) ?? null;
}

/**
 * Deletes a user row by id, scoped to the expected email as a defensive
 * check against acting on the wrong row. Callers are responsible for
 * confirming the outcome afterwards (see cleanupFreshProvisionedUser) —
 * this function does not verify anything itself.
 */
export async function deleteUserById(
  input: { id: string; email: string },
  client: Queryable,
): Promise<void> {
  await client.query(`DELETE FROM "user" WHERE id = $1 AND lower(email) = lower($2)`, [
    input.id,
    input.email,
  ]);
}

/** Better Auth stores email/password sign-in as an account with providerId = "credential". */
export async function hasCredentialAccount(
  userId: string,
  client: Queryable = getPool(),
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM "account" WHERE "userId" = $1 AND "providerId" = 'credential' LIMIT 1`,
    [userId],
  );
  return result.rows.length > 0;
}

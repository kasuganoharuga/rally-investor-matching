import "server-only";

import { getPool, type Queryable } from "@/lib/server/db";

/**
 * Creates the 1:1 product profile row for a newly provisioned user, if
 * it doesn't already exist. Idempotent by design (ON CONFLICT DO
 * NOTHING) so calling it more than once for the same user — e.g. as
 * part of a retried acceptance flow — is always safe.
 */
export async function ensureUserProfile(
  userId: string,
  client: Queryable = getPool(),
): Promise<void> {
  await client.query(
    `INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
}

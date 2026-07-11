import "server-only";

import type { PoolClient } from "pg";

import type { UserRole } from "@/features/auth/types/auth";

type OnboardingStatus = "new" | "profile_done" | "company_done" | "complete";

function isNonBlank(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Recomputes and writes user_profiles.onboarding_status from the current
 * state of user_profiles + company_profiles, inside the caller's
 * transaction. Must be called with a client obtained from
 * withTransaction() that has already taken (or is about to take) a
 * `FOR UPDATE` lock on this user's user_profiles row — both the
 * company-profile and settings save paths call this right after writing
 * their own table, so two concurrent saves must serialize on that lock
 * instead of each recomputing from a stale read of the other's data.
 *
 * Deliberately standalone under features/onboarding rather than owned by
 * either features/company-profile or features/settings: both call this,
 * neither should import internals from the other.
 */
export async function recomputeOnboardingStatus(
  client: PoolClient,
  userId: string,
  role: UserRole,
): Promise<void> {
  // Ensure an active row exists before locking it — invitation acceptance
  // normally creates one, but a soft-deleted or (defensively) missing row
  // must not make onboarding recompute a silent no-op.
  await client.query(
    `INSERT INTO user_profiles (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET deleted_at = NULL`,
    [userId],
  );

  const profileResult = await client.query<{
    first_name: string | null;
    last_name: string | null;
    country: string | null;
  }>(
    `SELECT first_name, last_name, country
     FROM user_profiles
     WHERE user_id = $1
     FOR UPDATE`,
    [userId],
  );
  const profile = profileResult.rows[0];
  const profileComplete =
    isNonBlank(profile?.first_name) &&
    isNonBlank(profile?.last_name) &&
    isNonBlank(profile?.country);

  let companyComplete = false;
  if (role === "founder") {
    const companyResult = await client.query(
      `SELECT 1 FROM company_profiles WHERE owner_user_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [userId],
    );
    companyComplete = companyResult.rowCount === 1;
  }

  let status: OnboardingStatus;
  if (role === "founder") {
    status =
      profileComplete && companyComplete
        ? "complete"
        : profileComplete
          ? "profile_done"
          : companyComplete
            ? "company_done"
            : "new";
  } else {
    status = profileComplete ? "complete" : "new";
  }

  const updateResult = await client.query(
    `UPDATE user_profiles SET onboarding_status = $2, updated_at = now()
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId, status],
  );
  if (updateResult.rowCount !== 1) {
    throw new Error(
      "recomputeOnboardingStatus: active user_profiles row was not found for update",
    );
  }
}

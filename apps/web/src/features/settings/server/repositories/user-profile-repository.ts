import "server-only";

import {
  onboardingStatusSchema,
  type UserProfile,
  type UserProfileInput,
} from "@/features/settings/types/user-profile";
import { getPool, type Queryable } from "@/lib/server/db";

const SELECT_COLUMNS = `
  first_name,
  last_name,
  full_name,
  linkedin_url,
  phone,
  role_at_company,
  bio,
  country,
  state,
  city,
  onboarding_status,
  created_at,
  updated_at
`;

type UserProfileRow = {
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  linkedin_url: string | null;
  phone: string | null;
  role_at_company: string | null;
  bio: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  onboarding_status: string;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: UserProfileRow): UserProfile {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    linkedinUrl: row.linkedin_url,
    phone: row.phone,
    roleAtCompany: row.role_at_company,
    bio: row.bio,
    country: row.country,
    state: row.state,
    city: row.city,
    onboardingStatus: onboardingStatusSchema.parse(row.onboarding_status),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Restores a soft-deleted row and guarantees an active one exists,
 * without touching any of the editable fields — safe to call from a
 * plain GET, unlike upsertForUser below which replaces every field.
 */
export async function ensureActiveUserProfile(
  userId: string,
  client: Queryable = getPool(),
): Promise<void> {
  await client.query(
    `INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET deleted_at = NULL`,
    [userId],
  );
}

export async function findByUser(
  userId: string,
  client: Queryable = getPool(),
): Promise<UserProfile | null> {
  const result = await client.query(
    `SELECT ${SELECT_COLUMNS} FROM user_profiles WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  const row = result.rows[0] as UserProfileRow | undefined;
  return row ? mapRow(row) : null;
}

/**
 * user_profiles.user_id is the primary key, so — unlike company_profiles
 * — there is never a "which row" ambiguity to resolve; ON CONFLICT
 * (user_id) is always the right target. Also restores a soft-deleted row
 * (deleted_at = NULL) since a PUT here means the user is actively
 * managing their profile again.
 */
export async function upsertForUser(
  userId: string,
  input: UserProfileInput,
  client: Queryable = getPool(),
): Promise<UserProfile> {
  const result = await client.query(
    `INSERT INTO user_profiles (
       user_id, first_name, last_name, linkedin_url, phone, role_at_company, bio, country, state, city
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       linkedin_url = EXCLUDED.linkedin_url,
       phone = EXCLUDED.phone,
       role_at_company = EXCLUDED.role_at_company,
       bio = EXCLUDED.bio,
       country = EXCLUDED.country,
       state = EXCLUDED.state,
       city = EXCLUDED.city,
       deleted_at = NULL,
       updated_at = now()
     RETURNING ${SELECT_COLUMNS}`,
    [
      userId,
      input.firstName,
      input.lastName,
      input.linkedinUrl,
      input.phone,
      input.roleAtCompany,
      input.bio,
      input.country,
      input.state,
      input.city,
    ],
  );
  return mapRow(result.rows[0] as UserProfileRow);
}

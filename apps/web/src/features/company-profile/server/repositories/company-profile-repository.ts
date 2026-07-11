import "server-only";

import type {
  CompanyProfile,
  CompanyProfileInput,
} from "@/features/company-profile/types/company-profile";
import { getPool, type Queryable } from "@/lib/server/db";

const SELECT_COLUMNS = `
  name,
  website_url,
  linkedin_url,
  one_liner,
  description,
  hq_country,
  hq_state,
  hq_city,
  hq_street,
  hq_postal_code,
  hq_address_full,
  founded_year,
  created_at,
  updated_at
`;

type CompanyProfileRow = {
  name: string;
  website_url: string | null;
  linkedin_url: string | null;
  one_liner: string | null;
  description: string | null;
  hq_country: string | null;
  hq_state: string | null;
  hq_city: string | null;
  hq_street: string | null;
  hq_postal_code: string | null;
  hq_address_full: string | null;
  founded_year: number | null;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: CompanyProfileRow): CompanyProfile {
  return {
    name: row.name,
    websiteUrl: row.website_url,
    linkedinUrl: row.linkedin_url,
    oneLiner: row.one_liner,
    description: row.description,
    hqCountry: row.hq_country,
    hqState: row.hq_state,
    hqCity: row.hq_city,
    hqStreet: row.hq_street,
    hqPostalCode: row.hq_postal_code,
    hqAddressFull: row.hq_address_full,
    foundedYear: row.founded_year,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * At most one active row per owner — enforced by
 * idx_company_profiles_owner_unique, not by this query picking "the
 * most recent" among several.
 */
export async function findByOwner(
  ownerUserId: string,
  client: Queryable = getPool(),
): Promise<CompanyProfile | null> {
  const result = await client.query(
    `SELECT ${SELECT_COLUMNS} FROM company_profiles WHERE owner_user_id = $1 AND deleted_at IS NULL`,
    [ownerUserId],
  );
  const row = result.rows[0] as CompanyProfileRow | undefined;
  return row ? mapRow(row) : null;
}

/**
 * Atomic create-or-replace keyed on the unique (owner_user_id) partial
 * index. A PUT is always a full replace of every column below — there is
 * no partial-update path, so a soft-deleted row's replacement is a brand
 * new active row rather than resurrecting old field values.
 */
export async function upsertForOwner(
  ownerUserId: string,
  input: CompanyProfileInput,
  client: Queryable = getPool(),
): Promise<CompanyProfile> {
  const result = await client.query(
    `INSERT INTO company_profiles (
       owner_user_id,
       name,
       website_url,
       linkedin_url,
       one_liner,
       description,
       hq_country,
       hq_state,
       hq_city,
       hq_street,
       hq_postal_code,
       founded_year
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (owner_user_id) WHERE deleted_at IS NULL
     DO UPDATE SET
       name = EXCLUDED.name,
       website_url = EXCLUDED.website_url,
       linkedin_url = EXCLUDED.linkedin_url,
       one_liner = EXCLUDED.one_liner,
       description = EXCLUDED.description,
       hq_country = EXCLUDED.hq_country,
       hq_state = EXCLUDED.hq_state,
       hq_city = EXCLUDED.hq_city,
       hq_street = EXCLUDED.hq_street,
       hq_postal_code = EXCLUDED.hq_postal_code,
       founded_year = EXCLUDED.founded_year,
       updated_at = now()
     RETURNING ${SELECT_COLUMNS}`,
    [
      ownerUserId,
      input.name,
      input.websiteUrl,
      input.linkedinUrl,
      input.oneLiner,
      input.description,
      input.hqCountry,
      input.hqState,
      input.hqCity,
      input.hqStreet,
      input.hqPostalCode,
      input.foundedYear,
    ],
  );
  return mapRow(result.rows[0] as CompanyProfileRow);
}

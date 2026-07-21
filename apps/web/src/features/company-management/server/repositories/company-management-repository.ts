import "server-only";

import type { ManagedCompany } from "@/features/company-management/types/company-management";
import type { CompanyProfileInput } from "@/features/company-profile/types/company-profile";
import { getPool, type Queryable } from "@/lib/server/db";

const MANAGED_COMPANY_SELECT = `
  SELECT
    cp.id,
    cp.name,
    cp.website_url,
    cp.linkedin_url,
    cp.one_liner,
    cp.description,
    cp.hq_country,
    cp.hq_state,
    cp.hq_city,
    cp.hq_street,
    cp.hq_postal_code,
    cp.hq_address_full,
    cp.founded_year,
    cp.created_at,
    cp.updated_at,
    u.id AS owner_user_id,
    u.email AS owner_email,
    u.name AS owner_name,
    up.role_at_company,
    up.onboarding_status,
    cmp.id AS matching_profile_id,
    cmp.stage::text AS matching_stage,
    cmp.sector_primary,
    cmp.use_case_primary,
    cmp.customer_type::text AS customer_type,
    cmp.business_model::text AS business_model,
    cmp.target_geographies,
    cmp.raise_amount_min,
    cmp.raise_amount_max,
    cmp.raise_currency,
    cmp.updated_at AS matching_profile_updated_at,
    COALESCE(document_stats.document_count, 0)::int AS document_count,
    COALESCE(run_stats.match_run_count, 0)::int AS match_run_count,
    run_stats.last_matched_at
  FROM company_profiles cp
  JOIN "user" u ON u.id = cp.owner_user_id
  LEFT JOIN user_profiles up
    ON up.user_id = cp.owner_user_id AND up.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT
      profile.id,
      profile.stage,
      profile.sector_primary,
      profile.use_case_primary,
      profile.customer_type,
      profile.business_model,
      profile.target_geographies,
      profile.raise_amount_min,
      profile.raise_amount_max,
      profile.raise_currency,
      profile.updated_at
    FROM company_matching_profiles profile
    WHERE profile.company_profile_id = cp.id
      AND profile.is_current
      AND profile.deleted_at IS NULL
    ORDER BY profile.updated_at DESC
    LIMIT 1
  ) cmp ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS document_count
    FROM company_documents document
    WHERE document.company_profile_id = cp.id AND document.deleted_at IS NULL
  ) document_stats ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS match_run_count, MAX(run.created_at) AS last_matched_at
    FROM matching_runs run
    WHERE run.company_profile_id = cp.id AND run.deleted_at IS NULL
  ) run_stats ON true
`;

type ManagedCompanyRow = {
  id: string;
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
  owner_user_id: string;
  owner_email: string;
  owner_name: string;
  role_at_company: string | null;
  onboarding_status: string | null;
  matching_profile_id: string | null;
  matching_stage: string | null;
  sector_primary: string | null;
  use_case_primary: string | null;
  customer_type: string | null;
  business_model: string | null;
  target_geographies: unknown;
  raise_amount_min: string | number | null;
  raise_amount_max: string | number | null;
  raise_currency: string | null;
  matching_profile_updated_at: Date | null;
  document_count: number;
  match_run_count: number;
  last_matched_at: Date | null;
};

function nullableNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapRow(row: ManagedCompanyRow): ManagedCompany {
  return {
    id: row.id,
    owner: {
      userId: row.owner_user_id,
      email: row.owner_email,
      name: row.owner_name,
      roleAtCompany: row.role_at_company,
      onboardingStatus: row.onboarding_status,
    },
    profile: {
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
    },
    currentMatchingProfile: row.matching_profile_id
      ? {
          id: row.matching_profile_id,
          stage: row.matching_stage,
          sectorPrimary: row.sector_primary,
          useCasePrimary: row.use_case_primary,
          customerType: row.customer_type,
          businessModel: row.business_model,
          targetGeographies: stringArray(row.target_geographies),
          raiseAmountMin: nullableNumber(row.raise_amount_min),
          raiseAmountMax: nullableNumber(row.raise_amount_max),
          raiseCurrency: row.raise_currency?.trim() ?? null,
          updatedAt:
            row.matching_profile_updated_at?.toISOString() ??
            row.updated_at.toISOString(),
        }
      : null,
    documentCount: row.document_count,
    matchRunCount: row.match_run_count,
    lastMatchedAt: row.last_matched_at?.toISOString() ?? null,
  };
}

export async function listCompanies(
  client: Queryable = getPool(),
): Promise<ManagedCompany[]> {
  const result = await client.query(
    `${MANAGED_COMPANY_SELECT}
     WHERE cp.deleted_at IS NULL
     ORDER BY cp.updated_at DESC, lower(cp.name)`,
  );
  return (result.rows as ManagedCompanyRow[]).map(mapRow);
}

export async function findCompanyById(
  id: string,
  client: Queryable = getPool(),
): Promise<ManagedCompany | null> {
  const result = await client.query(
    `${MANAGED_COMPANY_SELECT}
     WHERE cp.id = $1 AND cp.deleted_at IS NULL`,
    [id],
  );
  const row = result.rows[0] as ManagedCompanyRow | undefined;
  return row ? mapRow(row) : null;
}

export async function updateCompany(
  id: string,
  input: CompanyProfileInput,
  client: Queryable = getPool(),
): Promise<boolean> {
  const result = await client.query(
    `UPDATE company_profiles
     SET
       name = $2,
       website_url = $3,
       linkedin_url = $4,
       one_liner = $5,
       description = $6,
       hq_country = $7,
       hq_state = $8,
       hq_city = $9,
       hq_street = $10,
       hq_postal_code = $11,
       founded_year = $12,
       updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL`,
    [
      id,
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
  return result.rowCount === 1;
}

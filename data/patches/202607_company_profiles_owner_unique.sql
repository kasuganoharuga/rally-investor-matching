-- One-time patch for local/AWS databases that already applied the old
-- plain idx_company_profiles_owner index (from
-- data/schemas/vc_matching_schema_aws_with_mvp_compat.sql before this
-- patch). Not needed on a fresh Docker volume: the schema file above now
-- creates the unique index directly.
--
-- Wrapped in an explicit transaction (not two standalone statements) so
-- that if duplicate active company_profiles rows exist for some owner,
-- CREATE UNIQUE INDEX fails and rolls back — leaving the old index in
-- place instead of leaving the database with no owner index at all.
--
-- Apply directly against the target database, e.g.:
--   psql "postgresql://rally:rally_dev_password@localhost:5432/rally_investor_matching" \
--     -f data/patches/202607_company_profiles_owner_unique.sql
BEGIN;

DROP INDEX IF EXISTS idx_company_profiles_owner;

CREATE UNIQUE INDEX idx_company_profiles_owner_unique
  ON company_profiles(owner_user_id) WHERE deleted_at IS NULL;

COMMIT;

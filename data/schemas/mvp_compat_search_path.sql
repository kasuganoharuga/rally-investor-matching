-- Local docker bootstrap helper: make mvp_compat the default search_path.
--
-- vc_matching_schema_aws_with_mvp_compat.sql creates the formal cloud schema in
-- public.* and the current MVP app's tables in mvp_compat.*. The current
-- FastAPI/Next.js app and data/seeds/local_investors.sql use unqualified table
-- names (e.g. "investors", not "mvp_compat.investors"), so the database needs a
-- default search_path of mvp_compat, public for that to resolve correctly.
--
-- This mirrors the AWS deployment note in infra/aws/README.md:
--   ALTER ROLE app_user IN DATABASE app_db SET search_path = mvp_compat, public;
-- but targets the whole local dev database rather than a specific role, since
-- local docker only has one app role.
DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET search_path = mvp_compat, public',
    current_database()
  );
END
$$;

-- Sample-import patch for the formal VC matching schema.
--
-- Purpose:
--   1. Preserve source-system identity for incremental imports.
--   2. Expose the two-layer actual preference taxonomy directly on
--      investor_actual_stage_preferences for matching/debugging.
--
-- This patch is idempotent and safe to apply after
-- data/schemas/vc_matching_schema_aws_with_mvp_compat.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS investor_external_ids (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id     uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  source_provider data_source_provider NOT NULL,
  external_id     text NOT NULL,
  external_url    text,
  first_seen_at   timestamptz,
  last_seen_at    timestamptz,
  source_payload  jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_investor_external_ids_provider_id
  ON investor_external_ids(source_provider, external_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_investor_external_ids_investor
  ON investor_external_ids(investor_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS investee_external_ids (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investee_company_id uuid NOT NULL REFERENCES investee_company_profiles(id) ON DELETE CASCADE,
  source_provider     data_source_provider NOT NULL,
  external_id         text NOT NULL,
  external_url        text,
  first_seen_at       timestamptz,
  last_seen_at        timestamptz,
  source_payload      jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_investee_external_ids_provider_id
  ON investee_external_ids(source_provider, external_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_investee_external_ids_company
  ON investee_external_ids(investee_company_id)
  WHERE deleted_at IS NULL;

ALTER TABLE investor_actual_stage_preferences
  ADD COLUMN IF NOT EXISTS actual_sector text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS actual_themes text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_stage_prefs_actual_sector
  ON investor_actual_stage_preferences USING gin(actual_sector)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_stage_prefs_actual_themes
  ON investor_actual_stage_preferences USING gin(actual_themes)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS classification_manual_review_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table       text NOT NULL,
  record_key         text NOT NULL,
  related_record_key text,
  company_name       text,
  issue_type         text NOT NULL,
  missing_dimensions text[] NOT NULL DEFAULT '{}',
  source_payload     jsonb NOT NULL DEFAULT '{}',
  suggested_action   text,
  status             text NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_classification_manual_review_status
    CHECK (status IN ('pending','resolved','ignored')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_classification_manual_review_unique
  ON classification_manual_review_items(source_table, record_key, issue_type);

CREATE INDEX IF NOT EXISTS idx_classification_manual_review_status
  ON classification_manual_review_items(status, created_at DESC);

COMMIT;

-- Persistent Step 4 settings. Apply after the Better Auth "user" table exists.
-- Additive and safe to reapply; never changes match-history snapshots.
-- Only weights are persisted by the application; non-weight configuration fields
-- retain built-in defaults. Eligibility and result options remain per-match.
BEGIN;

CREATE TABLE IF NOT EXISTS matching_global_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS matching_reviewer_settings_revision_seq
  AS integer MINVALUE 1 NO CYCLE;

CREATE TABLE IF NOT EXISTS matching_reviewer_settings (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
  revision integer NOT NULL DEFAULT nextval('matching_reviewer_settings_revision_seq')
    CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Also upgrade a previously applied version of this additive patch. ALTER TABLE
-- holds its write-blocking lock until COMMIT, so sequence alignment cannot race
-- the application's inserts/updates. Never reuse a revision after reset/delete.
ALTER TABLE matching_reviewer_settings
  ALTER COLUMN revision SET DEFAULT nextval('matching_reviewer_settings_revision_seq');
ALTER SEQUENCE matching_reviewer_settings_revision_seq
  OWNED BY matching_reviewer_settings.revision;
SELECT setval(
  'matching_reviewer_settings_revision_seq',
  GREATEST(sequence_state.last_value, COALESCE(existing.max_revision, 1)),
  sequence_state.is_called OR existing.max_revision IS NOT NULL
)
FROM matching_reviewer_settings_revision_seq AS sequence_state
CROSS JOIN (
  SELECT max(revision) AS max_revision FROM matching_reviewer_settings
) AS existing;

INSERT INTO matching_global_settings (singleton, configuration)
VALUES (true, '{
  "weights": {
    "stage_evidence_depth": 10,
    "geography_fit": 5,
    "sector_fit": 20,
    "theme_fit": 20,
    "recent_deal_similarity": 25,
    "customer_icp_fit": 5,
    "cheque_size_fit": 5,
    "lead_behavior_fit": 5,
    "data_quality_recency": 5
  },
  "hard_filters": {"stage": true, "geography": true},
  "result_limit": 20,
  "excluded_investor_types": []
}'::jsonb)
ON CONFLICT (singleton) DO NOTHING;

COMMIT;

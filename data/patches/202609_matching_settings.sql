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

CREATE TABLE IF NOT EXISTS matching_reviewer_settings (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  configuration jsonb NOT NULL CHECK (jsonb_typeof(configuration) = 'object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

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

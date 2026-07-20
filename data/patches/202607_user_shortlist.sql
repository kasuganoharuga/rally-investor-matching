-- User-owned investor shortlist for the formal app.
-- Product/user state lives in Next.js/Postgres, separate from the
-- FastAPI matching read paths.

CREATE TABLE IF NOT EXISTS user_shortlisted_investors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  source      text NOT NULL DEFAULT 'manual'
    CONSTRAINT chk_shortlist_source
    CHECK (
      source IN (
        'manual',
        'investor_directory',
        'investor_profile',
        'match_detail',
        'vc_profile'
      )
    ),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  CONSTRAINT user_shortlisted_investors_user_investor_unique
    UNIQUE (user_id, investor_id)
);

CREATE INDEX IF NOT EXISTS idx_user_shortlisted_investors_user
  ON user_shortlisted_investors(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_shortlisted_investors_investor
  ON user_shortlisted_investors(investor_id)
  WHERE deleted_at IS NULL;

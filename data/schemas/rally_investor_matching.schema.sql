-- Rally Investor Matching
-- Unified local PostgreSQL schema from the shared database structure.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'team_member',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('founder', 'team_member', 'admin'))
);

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  investor_type TEXT,
  website_url TEXT,
  linkedin_url TEXT,
  founded_year INTEGER,

  -- Firm location
  hq_country TEXT,
  hq_state TEXT,
  hq_city TEXT,

  -- Investment preference / matching
  stage_focus TEXT[] DEFAULT '{}',
  sector_focus TEXT[] DEFAULT '{}',
  geography_focus TEXT[] DEFAULT '{}',
  business_model_focus TEXT[] DEFAULT '{}',
  founder_fit TEXT[] DEFAULT '{}',
  cheque_ranges JSONB DEFAULT '[]'::jsonb,
  lead_behavior TEXT DEFAULT 'unknown',
  ai_appetite TEXT DEFAULT 'unknown',

  -- Recent deals for reverse-inference
  recent_deals JSONB DEFAULT '[]'::jsonb,

  -- Approach
  entry_channels TEXT[] DEFAULT '{}',
  preferred_channel TEXT,

  -- Simple screening
  screening_status TEXT DEFAULT 'unscreened',
  screening_priority TEXT DEFAULT 'unknown',
  screening_notes TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

DROP TRIGGER IF EXISTS investors_set_updated_at ON investors;
CREATE TRIGGER investors_set_updated_at
BEFORE UPDATE ON investors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS investors_name_idx ON investors(name);
CREATE INDEX IF NOT EXISTS investors_slug_idx ON investors(slug);
CREATE INDEX IF NOT EXISTS investors_stage_focus_gin_idx ON investors USING gin(stage_focus);
CREATE INDEX IF NOT EXISTS investors_sector_focus_gin_idx ON investors USING gin(sector_focus);
CREATE INDEX IF NOT EXISTS investors_geography_focus_gin_idx ON investors USING gin(geography_focus);
CREATE INDEX IF NOT EXISTS investors_business_model_focus_gin_idx
ON investors USING gin(business_model_focus);

ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS cheque_ranges JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS investors_cheque_ranges_gin_idx ON investors USING gin(cheque_ranges);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  investor_slug TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  section_key TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  source_urls TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  confidence TEXT DEFAULT 'medium',
  review_needed BOOLEAN DEFAULT false,
  rag_allowed BOOLEAN DEFAULT true,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(chunk_text, ''))
  ) STORED,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

DROP TRIGGER IF EXISTS rag_chunks_set_updated_at ON rag_chunks;
CREATE TRIGGER rag_chunks_set_updated_at
BEFORE UPDATE ON rag_chunks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS rag_chunks_investor_idx ON rag_chunks(investor_id);
CREATE INDEX IF NOT EXISTS rag_chunks_investor_slug_idx ON rag_chunks(investor_slug);
CREATE INDEX IF NOT EXISTS rag_chunks_section_idx ON rag_chunks(section_key);
CREATE INDEX IF NOT EXISTS rag_chunks_search_vector_idx
ON rag_chunks USING gin(search_vector);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  website_url TEXT,
  linkedin_url TEXT,
  one_liner TEXT,
  description TEXT,

  -- Company location
  hq_country TEXT,
  hq_state TEXT,
  hq_city TEXT,
  operating_geographies TEXT[] DEFAULT '{}',

  -- Team / founder signals
  founder_attributes TEXT[] DEFAULT '{}',
  team_size INTEGER,

  -- Startup profile / matching fields
  stage TEXT,
  sectors TEXT[] DEFAULT '{}',
  business_models TEXT[] DEFAULT '{}',
  traction_status TEXT,
  traction_notes TEXT,

  -- Fundraising
  is_raising BOOLEAN DEFAULT false,
  raising_amount_aud INTEGER,
  target_round TEXT,
  valuation_aud INTEGER,

  -- AI relevance
  ai_relevance TEXT DEFAULT 'unknown',

  -- Screening
  screening_status TEXT DEFAULT 'unscreened',
  screening_priority TEXT DEFAULT 'unknown',
  screening_notes TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

DROP TRIGGER IF EXISTS companies_set_updated_at ON companies;
CREATE TRIGGER companies_set_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS companies_user_idx ON companies(user_id);
CREATE INDEX IF NOT EXISTS companies_slug_idx ON companies(slug);
CREATE INDEX IF NOT EXISTS companies_stage_idx ON companies(stage);
CREATE INDEX IF NOT EXISTS companies_sectors_gin_idx ON companies USING gin(sectors);
CREATE INDEX IF NOT EXISTS companies_business_models_gin_idx
ON companies USING gin(business_models);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'created',
  -- created / completed / reviewed
  matching_goal TEXT DEFAULT 'investor_shortlist',
  -- investor_shortlist / fundraising / warm_intro
  total_results INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

DROP TRIGGER IF EXISTS matches_set_updated_at ON matches;
CREATE TRIGGER matches_set_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS matches_user_idx ON matches(user_id);
CREATE INDEX IF NOT EXISTS matches_company_idx ON matches(company_id);
CREATE INDEX IF NOT EXISTS matches_status_idx ON matches(status);

CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  rank INTEGER,
  match_score INTEGER,
  match_tier TEXT,
  -- strong / possible / weak

  -- Match dimensions
  stage_match BOOLEAN DEFAULT false,
  sector_match BOOLEAN DEFAULT false,
  geography_match BOOLEAN DEFAULT false,
  business_model_match BOOLEAN DEFAULT false,
  cheque_match BOOLEAN DEFAULT false,
  founder_fit_match BOOLEAN DEFAULT false,
  ai_match BOOLEAN DEFAULT false,
  lead_behavior_match BOOLEAN DEFAULT false,
  recent_deal_match BOOLEAN DEFAULT false,

  -- Explanation
  match_reasons TEXT[] DEFAULT '{}',
  mismatch_reasons TEXT[] DEFAULT '{}',

  -- Recent deal support
  supporting_recent_deals JSONB DEFAULT '[]'::jsonb,

  -- Human action status
  result_status TEXT DEFAULT 'suggested',
  -- suggested / shortlisted / rejected / contacted / archived
  notes TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (match_id, investor_id)
);

DROP TRIGGER IF EXISTS match_results_set_updated_at ON match_results;
CREATE TRIGGER match_results_set_updated_at
BEFORE UPDATE ON match_results
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS match_results_match_rank_idx ON match_results(match_id, rank);
CREATE INDEX IF NOT EXISTS match_results_investor_idx ON match_results(investor_id);
CREATE INDEX IF NOT EXISTS match_results_tier_idx ON match_results(match_tier);

DROP VIEW IF EXISTS investor_cards;

CREATE VIEW investor_cards AS
SELECT
  id,
  name,
  slug,
  investor_type,
  website_url,
  hq_country,
  hq_state,
  hq_city,
  stage_focus,
  sector_focus,
  geography_focus,
  business_model_focus,
  cheque_ranges,
  lead_behavior,
  ai_appetite,
  entry_channels,
  preferred_channel,
  screening_status,
  screening_priority,
  screening_notes,
  updated_at
FROM investors;

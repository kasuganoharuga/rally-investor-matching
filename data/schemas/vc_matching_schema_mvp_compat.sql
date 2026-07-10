-- MVP compatibility layer for the formal VC matching cloud schema.
--
-- Purpose:
--   Keep the formal cloud schema in public.* unchanged, while allowing the
--   current local/test MVP app and seed data to run against the same database.
--
-- Usage on a fresh cloud database:
--   1. Run the latest formal vc_matching_schema.sql.sql file.
--   2. Run this file.
--   3. For the current MVP app/seed session, set search_path to:
--        mvp_compat, public
--
-- AWS deployment note:
--   Keep the app role/database default search_path outside this file, e.g.
--     ALTER ROLE app_user IN DATABASE app_db SET search_path = mvp_compat, public;
--
-- Removal after migration to the formal schema:
--   DROP SCHEMA IF EXISTS mvp_compat CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS mvp_compat;

COMMENT ON SCHEMA mvp_compat IS 'Temporary compatibility schema for the MVP Rally investor matching app. Drop after migrating to the formal public schema.';

CREATE OR REPLACE FUNCTION mvp_compat.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS mvp_compat.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'team_member',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('founder', 'team_member', 'admin'))
);

DROP TRIGGER IF EXISTS users_set_updated_at ON mvp_compat.users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON mvp_compat.users
FOR EACH ROW EXECUTE FUNCTION mvp_compat.set_updated_at();

CREATE TABLE IF NOT EXISTS mvp_compat.investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  investor_type TEXT,
  website_url TEXT,
  linkedin_url TEXT,
  founded_year INTEGER,
  hq_country TEXT,
  hq_state TEXT,
  hq_city TEXT,
  stage_focus TEXT[] DEFAULT '{}',
  sector_focus TEXT[] DEFAULT '{}',
  geography_focus TEXT[] DEFAULT '{}',
  business_model_focus TEXT[] DEFAULT '{}',
  founder_fit TEXT[] DEFAULT '{}',
  cheque_ranges JSONB DEFAULT '[]'::jsonb,
  lead_behavior TEXT DEFAULT 'unknown',
  ai_appetite TEXT DEFAULT 'unknown',
  recent_deals JSONB DEFAULT '[]'::jsonb,
  entry_channels TEXT[] DEFAULT '{}',
  preferred_channel TEXT,
  screening_status TEXT DEFAULT 'unscreened',
  screening_priority TEXT DEFAULT 'unknown',
  screening_notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

DROP TRIGGER IF EXISTS investors_set_updated_at ON mvp_compat.investors;
CREATE TRIGGER investors_set_updated_at
BEFORE UPDATE ON mvp_compat.investors
FOR EACH ROW EXECUTE FUNCTION mvp_compat.set_updated_at();

CREATE INDEX IF NOT EXISTS investors_name_idx
ON mvp_compat.investors(name);
CREATE INDEX IF NOT EXISTS investors_slug_idx
ON mvp_compat.investors(slug);
CREATE INDEX IF NOT EXISTS investors_stage_focus_gin_idx
ON mvp_compat.investors USING gin(stage_focus);
CREATE INDEX IF NOT EXISTS investors_sector_focus_gin_idx
ON mvp_compat.investors USING gin(sector_focus);
CREATE INDEX IF NOT EXISTS investors_geography_focus_gin_idx
ON mvp_compat.investors USING gin(geography_focus);
CREATE INDEX IF NOT EXISTS investors_business_model_focus_gin_idx
ON mvp_compat.investors USING gin(business_model_focus);
CREATE INDEX IF NOT EXISTS investors_cheque_ranges_gin_idx
ON mvp_compat.investors USING gin(cheque_ranges);

CREATE TABLE IF NOT EXISTS mvp_compat.rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES mvp_compat.investors(id) ON DELETE CASCADE,
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

DROP TRIGGER IF EXISTS rag_chunks_set_updated_at ON mvp_compat.rag_chunks;
CREATE TRIGGER rag_chunks_set_updated_at
BEFORE UPDATE ON mvp_compat.rag_chunks
FOR EACH ROW EXECUTE FUNCTION mvp_compat.set_updated_at();

CREATE INDEX IF NOT EXISTS rag_chunks_investor_idx
ON mvp_compat.rag_chunks(investor_id);
CREATE INDEX IF NOT EXISTS rag_chunks_investor_slug_idx
ON mvp_compat.rag_chunks(investor_slug);
CREATE INDEX IF NOT EXISTS rag_chunks_section_idx
ON mvp_compat.rag_chunks(section_key);
CREATE INDEX IF NOT EXISTS rag_chunks_search_vector_idx
ON mvp_compat.rag_chunks USING gin(search_vector);

CREATE TABLE IF NOT EXISTS mvp_compat.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES mvp_compat.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  website_url TEXT,
  linkedin_url TEXT,
  one_liner TEXT,
  description TEXT,
  hq_country TEXT,
  hq_state TEXT,
  hq_city TEXT,
  operating_geographies TEXT[] DEFAULT '{}',
  founder_attributes TEXT[] DEFAULT '{}',
  team_size INTEGER,
  stage TEXT,
  sectors TEXT[] DEFAULT '{}',
  business_models TEXT[] DEFAULT '{}',
  traction_status TEXT,
  traction_notes TEXT,
  is_raising BOOLEAN DEFAULT false,
  raising_amount_aud INTEGER,
  target_round TEXT,
  valuation_aud INTEGER,
  ai_relevance TEXT DEFAULT 'unknown',
  screening_status TEXT DEFAULT 'unscreened',
  screening_priority TEXT DEFAULT 'unknown',
  screening_notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

DROP TRIGGER IF EXISTS companies_set_updated_at ON mvp_compat.companies;
CREATE TRIGGER companies_set_updated_at
BEFORE UPDATE ON mvp_compat.companies
FOR EACH ROW EXECUTE FUNCTION mvp_compat.set_updated_at();

CREATE INDEX IF NOT EXISTS companies_user_idx
ON mvp_compat.companies(user_id);
CREATE INDEX IF NOT EXISTS companies_slug_idx
ON mvp_compat.companies(slug);
CREATE INDEX IF NOT EXISTS companies_stage_idx
ON mvp_compat.companies(stage);
CREATE INDEX IF NOT EXISTS companies_sectors_gin_idx
ON mvp_compat.companies USING gin(sectors);
CREATE INDEX IF NOT EXISTS companies_business_models_gin_idx
ON mvp_compat.companies USING gin(business_models);

CREATE TABLE IF NOT EXISTS mvp_compat.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES mvp_compat.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES mvp_compat.companies(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'created',
  matching_goal TEXT DEFAULT 'investor_shortlist',
  total_results INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

DROP TRIGGER IF EXISTS matches_set_updated_at ON mvp_compat.matches;
CREATE TRIGGER matches_set_updated_at
BEFORE UPDATE ON mvp_compat.matches
FOR EACH ROW EXECUTE FUNCTION mvp_compat.set_updated_at();

CREATE INDEX IF NOT EXISTS matches_user_idx
ON mvp_compat.matches(user_id);
CREATE INDEX IF NOT EXISTS matches_company_idx
ON mvp_compat.matches(company_id);
CREATE INDEX IF NOT EXISTS matches_status_idx
ON mvp_compat.matches(status);

CREATE TABLE IF NOT EXISTS mvp_compat.match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES mvp_compat.matches(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES mvp_compat.investors(id) ON DELETE CASCADE,
  rank INTEGER,
  match_score INTEGER,
  match_tier TEXT,
  stage_match BOOLEAN DEFAULT false,
  sector_match BOOLEAN DEFAULT false,
  geography_match BOOLEAN DEFAULT false,
  business_model_match BOOLEAN DEFAULT false,
  cheque_match BOOLEAN DEFAULT false,
  founder_fit_match BOOLEAN DEFAULT false,
  ai_match BOOLEAN DEFAULT false,
  lead_behavior_match BOOLEAN DEFAULT false,
  recent_deal_match BOOLEAN DEFAULT false,
  match_reasons TEXT[] DEFAULT '{}',
  mismatch_reasons TEXT[] DEFAULT '{}',
  supporting_recent_deals JSONB DEFAULT '[]'::jsonb,
  result_status TEXT DEFAULT 'suggested',
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (match_id, investor_id)
);

DROP TRIGGER IF EXISTS match_results_set_updated_at ON mvp_compat.match_results;
CREATE TRIGGER match_results_set_updated_at
BEFORE UPDATE ON mvp_compat.match_results
FOR EACH ROW EXECUTE FUNCTION mvp_compat.set_updated_at();

CREATE INDEX IF NOT EXISTS match_results_match_rank_idx
ON mvp_compat.match_results(match_id, rank);
CREATE INDEX IF NOT EXISTS match_results_investor_idx
ON mvp_compat.match_results(investor_id);
CREATE INDEX IF NOT EXISTS match_results_tier_idx
ON mvp_compat.match_results(match_tier);

DROP VIEW IF EXISTS mvp_compat.investor_cards;

CREATE VIEW mvp_compat.investor_cards AS
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
FROM mvp_compat.investors;

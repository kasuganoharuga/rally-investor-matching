-- VC Match Intelligence
-- PostgreSQL + pgvector schema for a structured VC matching engine with an
-- evidence-grounded RAG explanation layer.
--
-- Design intent:
-- 1. JSON investor records remain the ingestion source of truth.
-- 2. Structured tables drive filtering, scoring, and review workflows.
-- 3. RAG chunks explain recommendations with confidence, source, and gap data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  CREATE TYPE confidence_level AS ENUM (
    'high',
    'medium_high',
    'medium',
    'low',
    'gap',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE review_status AS ENUM (
    'draft',
    'open',
    'reviewed',
    'approved',
    'rejected',
    'stale'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE fact_kind AS ENUM (
    'fact',
    'claim',
    'inference',
    'mixed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE date_precision AS ENUM (
    'day',
    'month',
    'year',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE business_model_orientation AS ENUM (
    'B2B',
    'B2C',
    'B2B2C',
    'B2G',
    'B2D',
    'Marketplace',
    'Mixed',
    'Gap'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE deal_verification_status AS ENUM (
    'verified_named_round',
    'official_portfolio_supported',
    'provisional_named_round',
    'non_verified_followon_event',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE source_strength AS ENUM (
    'strong',
    'medium',
    'weak',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE source_type AS ENUM (
    'official_vc_note',
    'official_portfolio_page',
    'portfolio_company_announcement',
    'independent_media',
    'free_public_database',
    'co_investor_announcement',
    'social_post',
    'official_fund_page',
    'official_team_page',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE source_role AS ENUM (
    'primary',
    'verification',
    'context',
    'claim',
    'routing',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Ingestion
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ingestion_files (
  ingestion_file_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id text NOT NULL,
  source_path text,
  s3_bucket text,
  s3_key text,
  source_sha256 text,
  schema_version text NOT NULL DEFAULT 'vc_match_intelligence_v1',
  imported_at timestamptz NOT NULL DEFAULT now(),
  raw_record jsonb NOT NULL,
  import_notes text,
  UNIQUE (investor_id, source_sha256)
);

-- ---------------------------------------------------------------------------
-- 2. Core investor record
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS investors (
  investor_id text PRIMARY KEY,
  investor_name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  fund_type text NOT NULL,
  founded_year integer,
  hq_location text,
  offices text[] NOT NULL DEFAULT '{}',
  geography_focus text[] NOT NULL DEFAULT '{}',
  themes_claimed text[] NOT NULL DEFAULT '{}',
  sectors_actual text[] NOT NULL DEFAULT '{}',
  stages_actual text[] NOT NULL DEFAULT '{}',
  leads_rounds text,
  archetype jsonb NOT NULL DEFAULT '{}'::jsonb,
  note_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  anz_mandate jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_overall confidence_level NOT NULL DEFAULT 'unknown',
  confidence_reviewed boolean NOT NULL DEFAULT false,
  review_status review_status NOT NULL DEFAULT 'draft',
  record_last_updated date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS investors_set_updated_at ON investors;
CREATE TRIGGER investors_set_updated_at
BEFORE UPDATE ON investors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS investor_fields (
  investor_field_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id text NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value jsonb NOT NULL,
  confidence confidence_level NOT NULL DEFAULT 'unknown',
  note text,
  review_needed boolean NOT NULL DEFAULT false,
  hard_filter_safe boolean NOT NULL DEFAULT false,
  raw_field jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investor_id, field_key)
);

DROP TRIGGER IF EXISTS investor_fields_set_updated_at ON investor_fields;
CREATE TRIGGER investor_fields_set_updated_at
BEFORE UPDATE ON investor_fields
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Matching-optimized snapshot derived from investors + investor_fields + deals.
-- This is the main table the API should read for fast filters and scoring.
CREATE TABLE IF NOT EXISTS investor_matching_profiles (
  investor_id text PRIMARY KEY REFERENCES investors(investor_id) ON DELETE CASCADE,
  local_au_anz_fund boolean,
  au_anz_relevance text,
  au_anz_relevance_confidence confidence_level NOT NULL DEFAULT 'unknown',
  mandate_strictness text,
  founder_eligibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  supported_stages text[] NOT NULL DEFAULT '{}',
  first_cheque_stages text[] NOT NULL DEFAULT '{}',
  supported_sectors text[] NOT NULL DEFAULT '{}',
  weak_fit_sectors text[] NOT NULL DEFAULT '{}',
  supported_business_models text[] NOT NULL DEFAULT '{}',
  business_model_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  cheque_min_value numeric,
  cheque_min_currency text,
  cheque_min_unit text,
  cheque_max_value numeric,
  cheque_max_currency text,
  cheque_max_unit text,
  cheque_confidence confidence_level NOT NULL DEFAULT 'unknown',
  cheque_hard_filter_safe boolean NOT NULL DEFAULT false,
  lead_behavior text,
  lead_behavior_confidence confidence_level NOT NULL DEFAULT 'unknown',
  recent_activity_level text,
  recent_activity_confidence confidence_level NOT NULL DEFAULT 'unknown',
  partner_routing_quality text,
  partner_routing_confidence confidence_level NOT NULL DEFAULT 'unknown',
  contact_path jsonb NOT NULL DEFAULT '{}'::jsonb,
  warm_intro_required boolean,
  evidence_completeness text,
  review_needed_fields text[] NOT NULL DEFAULT '{}',
  field_confidences jsonb NOT NULL DEFAULT '{}'::jsonb,
  derived_from_ingestion_file_id uuid REFERENCES ingestion_files(ingestion_file_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS investor_matching_profiles_set_updated_at ON investor_matching_profiles;
CREATE TRIGGER investor_matching_profiles_set_updated_at
BEFORE UPDATE ON investor_matching_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Deal evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS deals (
  deal_id text PRIMARY KEY,
  investor_id text NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  company text NOT NULL,
  round_stage text,
  round_amount_value numeric,
  round_amount_currency text,
  round_amount_unit text,
  round_amount_confidence confidence_level NOT NULL DEFAULT 'unknown',
  investor_cheque_value numeric,
  investor_cheque_currency text,
  investor_cheque_confidence confidence_level NOT NULL DEFAULT 'unknown',
  investor_cheque_note text,
  announced_date date,
  announced_date_precision date_precision NOT NULL DEFAULT 'unknown',
  deal_date date,
  role text,
  is_lead boolean,
  is_new_investment_for_investor boolean,
  is_follow_on_for_investor boolean,
  is_company_follow_on_round boolean,
  company_hq_country text,
  primary_market text,
  is_australia_company boolean,
  is_anz_company boolean,
  is_australia_related_deal boolean,
  company_level_australia_relevance_basis text,
  investor_mandate_fit boolean,
  investor_mandate_fit_basis text,
  hq_or_primary_market_anz boolean,
  company_anz_relevance boolean,
  anz_connection_basis text,
  business_model_orientation business_model_orientation,
  business_model_detail text,
  business_model_confidence confidence_level NOT NULL DEFAULT 'unknown',
  business_model_basis text,
  verification_status deal_verification_status NOT NULL DEFAULT 'unknown',
  deal_confidence confidence_level NOT NULL DEFAULT 'unknown',
  in_window boolean NOT NULL DEFAULT false,
  notes text,
  raw_deal jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS deals_set_updated_at ON deals;
CREATE TRIGGER deals_set_updated_at
BEFORE UPDATE ON deals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS deals_investor_idx ON deals(investor_id);
CREATE INDEX IF NOT EXISTS deals_company_idx ON deals(company);
CREATE INDEX IF NOT EXISTS deals_announced_date_idx ON deals(announced_date);
CREATE INDEX IF NOT EXISTS deals_stage_idx ON deals(round_stage);
CREATE INDEX IF NOT EXISTS deals_business_model_idx ON deals(business_model_orientation);
CREATE INDEX IF NOT EXISTS deals_anz_idx ON deals(company_anz_relevance, investor_mandate_fit);

-- Generic source table. Sources can attach to a fund, investor_field, deal,
-- partner, routing hypothesis, co-investment edge, or RAG chunk.
CREATE TABLE IF NOT EXISTS sources (
  source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id text REFERENCES investors(investor_id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  field_key text,
  url text NOT NULL,
  source_type source_type NOT NULL DEFAULT 'other',
  source_role source_role NOT NULL DEFAULT 'other',
  publisher text,
  source_strength source_strength NOT NULL DEFAULT 'unknown',
  retrieved_at timestamptz,
  raw_source jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_investor_idx ON sources(investor_id);
CREATE INDEX IF NOT EXISTS sources_entity_idx ON sources(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS sources_url_idx ON sources(url);
CREATE UNIQUE INDEX IF NOT EXISTS sources_entity_field_url_uq
ON sources(entity_type, entity_id, url, COALESCE(field_key, ''));

CREATE TABLE IF NOT EXISTS missing_sources (
  missing_source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id text NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  source_role source_role NOT NULL DEFAULT 'verification',
  required_source_type source_type,
  reason text NOT NULL,
  status review_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS missing_sources_set_updated_at ON missing_sources;
CREATE TRIGGER missing_sources_set_updated_at
BEFORE UPDATE ON missing_sources
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Team, routing, and co-investment graph
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS partners (
  partner_id text PRIMARY KEY,
  investor_id text NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  location text,
  official_profile_url text,
  linkedin_url text,
  linkedin_status text,
  linkedin_confidence confidence_level NOT NULL DEFAULT 'unknown',
  is_anz boolean,
  is_active boolean,
  raw_partner jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS partners_set_updated_at ON partners;
CREATE TRIGGER partners_set_updated_at
BEFORE UPDATE ON partners
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS partners_investor_idx ON partners(investor_id);
CREATE INDEX IF NOT EXISTS partners_name_idx ON partners(name);

CREATE TABLE IF NOT EXISTS partner_routing_hypotheses (
  routing_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id text NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  sector_or_use_case text NOT NULL,
  suggested_partner_names text[] NOT NULL DEFAULT '{}',
  suggested_partner_ids text[] NOT NULL DEFAULT '{}',
  evidence_basis text NOT NULL,
  confidence confidence_level NOT NULL DEFAULT 'unknown',
  reviewer_needed boolean NOT NULL DEFAULT true,
  raw_routing jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS partner_routing_hypotheses_set_updated_at ON partner_routing_hypotheses;
CREATE TRIGGER partner_routing_hypotheses_set_updated_at
BEFORE UPDATE ON partner_routing_hypotheses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS routing_investor_idx ON partner_routing_hypotheses(investor_id);

CREATE TABLE IF NOT EXISTS co_investment_edges (
  co_investment_edge_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id text NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  co_investor text NOT NULL,
  related_company text NOT NULL,
  related_deal_id text REFERENCES deals(deal_id) ON DELETE SET NULL,
  evidence_url text NOT NULL,
  source_type source_type NOT NULL DEFAULT 'other',
  confidence confidence_level NOT NULL DEFAULT 'unknown',
  use_case text NOT NULL DEFAULT 'context_only',
  raw_edge jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS co_investment_edges_investor_idx ON co_investment_edges(investor_id);
CREATE INDEX IF NOT EXISTS co_investment_edges_co_investor_idx ON co_investment_edges(co_investor);

-- ---------------------------------------------------------------------------
-- 5. Review and validation workflow
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS review_tasks (
  review_task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id text NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  field_key text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  reason text NOT NULL,
  suggested_action text NOT NULL,
  status review_status NOT NULL DEFAULT 'open',
  assigned_to text,
  resolved_note text,
  raw_task jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS review_tasks_set_updated_at ON review_tasks;
CREATE TRIGGER review_tasks_set_updated_at
BEFORE UPDATE ON review_tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS review_tasks_investor_idx ON review_tasks(investor_id);
CREATE INDEX IF NOT EXISTS review_tasks_status_idx ON review_tasks(status, priority);
CREATE INDEX IF NOT EXISTS review_tasks_entity_idx ON review_tasks(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS validation_search_logs (
  validation_search_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id text NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  entity_id text NOT NULL,
  search_status text NOT NULL,
  queries_used text[] NOT NULL DEFAULT '{}',
  result text NOT NULL,
  raw_log jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS validation_search_logs_investor_idx ON validation_search_logs(investor_id);
CREATE INDEX IF NOT EXISTS validation_search_logs_entity_idx ON validation_search_logs(entity_id);

-- ---------------------------------------------------------------------------
-- 6. RAG evidence layer
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rag_chunks (
  chunk_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id text NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  section_key text NOT NULL,
  chunk_text text NOT NULL,
  fact_kind fact_kind NOT NULL DEFAULT 'mixed',
  region_scope text,
  confidence confidence_level NOT NULL DEFAULT 'unknown',
  review_needed boolean NOT NULL DEFAULT false,
  rag_allowed boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding_model text,
  -- 1024 fits Amazon Titan Text Embeddings V2 default output.
  -- If you choose a different embedding model, change this dimension.
  embedding vector(1024),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS rag_chunks_set_updated_at ON rag_chunks;
CREATE TRIGGER rag_chunks_set_updated_at
BEFORE UPDATE ON rag_chunks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS rag_chunks_investor_idx ON rag_chunks(investor_id);
CREATE INDEX IF NOT EXISTS rag_chunks_entity_idx ON rag_chunks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS rag_chunks_section_idx ON rag_chunks(section_key);
CREATE INDEX IF NOT EXISTS rag_chunks_fact_confidence_idx ON rag_chunks(fact_kind, confidence);
CREATE INDEX IF NOT EXISTS rag_chunks_metadata_gin_idx ON rag_chunks USING gin(metadata);

-- HNSW is preferred for pgvector when available, but keep it as an explicit
-- post-deployment step so first schema creation does not fail on older clusters.
-- Run after confirming pgvector >= 0.5.0:
-- CREATE INDEX IF NOT EXISTS rag_chunks_embedding_hnsw_idx
-- ON rag_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS rag_chunk_sources (
  chunk_id uuid NOT NULL REFERENCES rag_chunks(chunk_id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(source_id) ON DELETE CASCADE,
  PRIMARY KEY (chunk_id, source_id)
);

-- ---------------------------------------------------------------------------
-- 7. Founder profiles and matching output
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS founder_profiles (
  founder_profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name text,
  raw_input text NOT NULL,
  parsed_profile jsonb NOT NULL,
  company_name text,
  company_hq_country text,
  primary_market text,
  founder_au_anz_connection text,
  stage text,
  round_type text,
  target_raise_value numeric,
  target_raise_currency text,
  sector text,
  business_model business_model_orientation,
  lead_needed boolean,
  warm_intro_available boolean,
  parser_model text,
  parser_confidence confidence_level NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founder_profiles_company_idx ON founder_profiles(company_name);
CREATE INDEX IF NOT EXISTS founder_profiles_stage_idx ON founder_profiles(stage);
CREATE INDEX IF NOT EXISTS founder_profiles_sector_idx ON founder_profiles(sector);

CREATE TABLE IF NOT EXISTS match_runs (
  match_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_profile_id uuid NOT NULL REFERENCES founder_profiles(founder_profile_id) ON DELETE CASCADE,
  scoring_version text NOT NULL,
  hard_filter_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  soft_score_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation_model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_results (
  match_result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_run_id uuid NOT NULL REFERENCES match_runs(match_run_id) ON DELETE CASCADE,
  investor_id text NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  rank integer NOT NULL,
  total_score numeric NOT NULL,
  hard_filter_passed boolean NOT NULL,
  hard_filter_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_contact_path jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_partner_routing jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_run_id, investor_id)
);

CREATE INDEX IF NOT EXISTS match_results_run_rank_idx ON match_results(match_run_id, rank);
CREATE INDEX IF NOT EXISTS match_results_investor_idx ON match_results(investor_id);

CREATE TABLE IF NOT EXISTS match_result_evidence (
  match_result_id uuid NOT NULL REFERENCES match_results(match_result_id) ON DELETE CASCADE,
  chunk_id uuid NOT NULL REFERENCES rag_chunks(chunk_id) ON DELETE CASCADE,
  evidence_role text NOT NULL DEFAULT 'supporting',
  retrieval_score numeric,
  used_in_explanation boolean NOT NULL DEFAULT true,
  PRIMARY KEY (match_result_id, chunk_id)
);

-- ---------------------------------------------------------------------------
-- 8. Useful views
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_investor_match_cards AS
SELECT
  i.investor_id,
  i.investor_name,
  i.fund_type,
  mp.au_anz_relevance,
  mp.local_au_anz_fund,
  mp.supported_stages,
  mp.first_cheque_stages,
  mp.supported_sectors,
  mp.supported_business_models,
  mp.cheque_min_value,
  mp.cheque_min_currency,
  mp.cheque_min_unit,
  mp.cheque_max_value,
  mp.cheque_max_currency,
  mp.cheque_max_unit,
  mp.cheque_confidence,
  mp.cheque_hard_filter_safe,
  mp.lead_behavior,
  mp.recent_activity_level,
  mp.partner_routing_quality,
  mp.warm_intro_required,
  mp.evidence_completeness,
  mp.review_needed_fields,
  i.confidence_reviewed,
  i.review_status
FROM investors i
LEFT JOIN investor_matching_profiles mp ON mp.investor_id = i.investor_id;

CREATE OR REPLACE VIEW v_open_review_gaps AS
SELECT
  investor_id,
  entity_type,
  entity_id,
  field_key,
  priority,
  reason,
  suggested_action,
  status,
  created_at
FROM review_tasks
WHERE status IN ('open', 'draft')
ORDER BY
  CASE priority
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
    ELSE 4
  END,
  created_at DESC;

CREATE OR REPLACE VIEW v_rag_chunks_for_search AS
SELECT
  chunk_id,
  investor_id,
  entity_type,
  entity_id,
  section_key,
  chunk_text,
  fact_kind,
  region_scope,
  confidence,
  review_needed,
  metadata,
  embedding_model,
  embedding
FROM rag_chunks
WHERE rag_allowed = true;

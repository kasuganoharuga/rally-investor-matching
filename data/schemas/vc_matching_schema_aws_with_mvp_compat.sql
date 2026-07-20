-- ============================================================
-- Rally VC Matching AWS Bootstrap Schema
-- ============================================================
-- Source formal schema: vc_matching_schema.sql.sql (latest Week4 handoff)
-- Compatibility layer: mvp_compat schema for the current MVP/test app
--
-- Intended target: fresh AWS RDS/Aurora PostgreSQL 15+ database.
-- Run this as the database owner or a role allowed to CREATE EXTENSION,
-- CREATE SCHEMA, CREATE TABLE, CREATE TYPE, CREATE FUNCTION, and CREATE TRIGGER.
--
-- Formal cloud tables are created in public.*.
-- MVP/test tables are created in mvp_compat.* so they can be removed later with:
--   DROP SCHEMA IF EXISTS mvp_compat CASCADE;
--
-- To run the current MVP app or local_investors seed against this database,
-- configure that app/session to use:
--   SET search_path TO mvp_compat, public;
--
-- For a persistent AWS role/database setting, run separately with real names:
--   ALTER ROLE app_user IN DATABASE app_db SET search_path = mvp_compat, public;
-- ============================================================

SET search_path TO public;

-- ============================================================
-- VC MATCHING PLATFORM — COMPLETE ONE-SHOT SCHEMA (PostgreSQL 15+)
-- Evidence-backed investor matching system for ANZ founders
-- Stack: Next.js + Better Auth + Postgres
--
-- Run this single file on a fresh database to create everything.
-- Tables ordered by dependency; all FKs inline.
--
-- SOFT DELETE CONVENTION
--   Every application table has deleted_at timestamptz.
--   NULL = live row; set to now() instead of DELETE.
--   All UNIQUE constraints are partial indexes with
--   "WHERE deleted_at IS NULL" so soft-deleted rows release
--   their unique keys. Application queries MUST filter
--   deleted_at IS NULL (add it to your ORM's default scope).
--   ON DELETE CASCADE clauses remain as a safety net for rare
--   hard deletes (e.g. GDPR erasure).
--
-- USER DELETION / GDPR
--   Some "user" FKs (matching_runs.user_id, company_documents.
--   uploaded_by_user_id, preference_review_history.reviewer_id) are
--   intentionally NOT cascade/set-null, so a hard DELETE of a user
--   is blocked by design. Recommended strategy is ANONYMISE, not
--   cascade-delete: matching history and review audit have business
--   value and should be retained with the user scrubbed, rather than
--   erased. Decide the concrete flow before enabling account deletion.
--
-- LAYERS
--   0. Auth & access                    : user, session, account, verification,
--                                         invitations
--   1. Vocabulary                       : taxonomy_terms
--   2. Profiles & canonical entities    : user_profiles, company_profiles,
--                                         company_matching_profiles,
--                                         company_documents,
--                                         contacts (people),
--                                         investors (orgs)
--   2b. Contact import history           : contact_import_batches
--   3. Raw evidence                     : investor_web_profiles,
--                                         investor_team_members,
--                                         investee_company_profiles,
--                                         funding_rounds, deal_investors
--   4. Derived preferences (pipeline)   : investor_actual_preferences,
--                                         investor_actual_stage_preferences
--   5. Matching                         : matching_runs, matching_recommendations
--   6. Review / audit                   : preference_review_history
--   7. Relationship graph               : contact_relationships
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ------------------------------------------------------------
-- ENUM types — controlled vocabularies enforced at DB level
-- ------------------------------------------------------------
CREATE TYPE investor_type AS ENUM (
  'vc_fund', 'angel', 'angel_group', 'family_office',
  'corporate_vc', 'accelerator', 'government_fund', 'other'
);

CREATE TYPE funding_stage AS ENUM (
  'pre_seed', 'seed', 'series_a', 'series_b', 'series_c_plus',
  'growth', 'bridge', 'unknown'
);

-- role IN a round (how they participated)
CREATE TYPE deal_role AS ENUM ('lead', 'co_lead', 'participant', 'undisclosed', 'unknown');

-- status relative to the company (orthogonal to role): a lead can be
-- a follow-on existing backer, a participant can be brand new, etc.
CREATE TYPE investor_participation_status AS ENUM (
  'new_investor', 'existing_investor', 'follow_on', 'unknown'
);

CREATE TYPE review_status AS ENUM (
  'unreviewed', 'approved', 'corrected', 'rejected', 'needs_more_data'
);

CREATE TYPE review_action AS ENUM (
  'approved', 'corrected', 'rejected', 'flagged_needs_more_data', 'note_only'
);

CREATE TYPE run_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TYPE recommendation_status AS ENUM (
  'new', 'viewed', 'saved', 'contacted', 'dismissed'
);

CREATE TYPE extraction_confidence AS ENUM ('high', 'medium', 'low');

-- Classification dimensions — comprehensive but deliberately bounded.
-- AI is NOT a sector; it lives in the ai_* fields as a modifier, so
-- a company is "AI-enabled enterprise software", never just "AI".
-- sector and use_case are NOT enums — they live in taxonomy_terms
-- (dimension='sector' / 'use_case') so ops can extend them without
-- a migration. 'ai' is simply never added to the sector vocabulary.
CREATE TYPE customer_type AS ENUM (
  'consumer', 'smb', 'mid_market', 'enterprise', 'developer',
  'healthcare_provider', 'government', 'education_institution',
  'other', 'unknown'
);

CREATE TYPE business_model_type AS ENUM (
  'subscription_saas', 'usage_based', 'transaction_fee', 'marketplace_take_rate',
  'licensing', 'hardware_sales', 'services', 'advertising',
  'freemium', 'commerce', 'other', 'unknown'
);

CREATE TYPE sales_motion_type AS ENUM (
  'plg', 'sales_led', 'channel_partner', 'community_led',
  'enterprise_top_down', 'self_serve', 'other', 'unknown'
);

CREATE TYPE technology_depth_type AS ENUM (
  'conventional_software', 'applied_ai', 'ai_infrastructure',
  'deep_tech_research', 'hardware_engineering', 'other', 'unknown'
);

-- AI as a modifier, split three ways (not a sector)
CREATE TYPE ai_relevance_type AS ENUM (
  'none', 'ai_enabled', 'ai_native', 'ai_infrastructure', 'unknown'
);

CREATE TYPE ai_usage_type AS ENUM (
  'copilot_or_agent', 'automation', 'analytics_prediction',
  'content_generation', 'model_infrastructure', 'data_infrastructure',
  'robotics_autonomy', 'not_applicable', 'unknown'
);

CREATE TYPE ai_core_or_enabler_type AS ENUM (
  'core_product', 'feature_layer', 'operational_tool', 'unclear'
);

CREATE TYPE data_source_provider AS ENUM (
  'crunchbase', 'pitchbook', 'dealroom', 'announcement', 'manual', 'other'
);

-- ============================================================
-- LAYER 0 — AUTH & ACCESS
-- Better Auth v1 default Postgres schema (camelCase columns,
-- text ids). `role` is an additionalField — declare it in your
-- betterAuth() config. Better Auth tables keep hard delete
-- (auth lifecycle is managed by the library).
-- After deploy, verify drift with: npx @better-auth/cli generate
-- ============================================================

CREATE TABLE "user" (
  "id"            text PRIMARY KEY,
  "name"          text NOT NULL,
  "email"         text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image"         text,
  "role"          text NOT NULL DEFAULT 'founder',  -- founder | reviewer | admin
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "session" (
  "id"        text PRIMARY KEY,
  "userId"    text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token"     text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_user ON "session"("userId");

CREATE TABLE "account" (
  "id"                    text PRIMARY KEY,
  "userId"                text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accountId"             text NOT NULL,
  "providerId"            text NOT NULL,
  "accessToken"           text,
  "refreshToken"          text,
  "idToken"               text,
  "accessTokenExpiresAt"  timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope"                 text,
  "password"              text,
  "createdAt"             timestamptz NOT NULL DEFAULT now(),
  "updatedAt"             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_user ON "account"("userId");

CREATE TABLE "verification" (
  "id"         text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value"      text NOT NULL,
  "expiresAt"  timestamptz NOT NULL,
  "createdAt"  timestamptz NOT NULL DEFAULT now(),
  "updatedAt"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_identifier ON "verification"("identifier");

-- ------------------------------------------------------------
-- invitations
-- Invite-only access control in the DB, not scattered in code.
-- Signup checks for a pending, unexpired token. Store token as
-- a hash (sha256) in application code; email the raw token.
-- Partial UNIQUE prevents duplicate pending invites per email.
-- ------------------------------------------------------------
CREATE TABLE invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  role         text NOT NULL DEFAULT 'founder'
    CONSTRAINT chk_invitations_role CHECK (role IN ('founder','reviewer','admin')),
  token        text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_invitations_status CHECK (status IN ('pending','accepted','expired','revoked')),
  invited_by   text REFERENCES "user"("id"),
  accepted_by  text REFERENCES "user"("id"),
  expires_at   timestamptz NOT NULL,
  accepted_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE UNIQUE INDEX idx_invitations_token
  ON invitations(token) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_invitations_pending_email
  ON invitations(lower(email))
  WHERE status = 'pending' AND deleted_at IS NULL;

-- ============================================================
-- LAYER 1 — VOCABULARY
-- ============================================================

-- ------------------------------------------------------------
-- taxonomy_terms
-- Single source of truth for every controlled vocabulary used in
-- extraction prompts and matching (sector, use_case, customer_type,
-- business_model, sales_motion, technology_depth, ai_relevance,
-- geography, archetype). `aliases` normalises AI output and
-- prevents label drift.
-- `description` is also the semantic source for mapping a founder's
-- free-text (from chat) to controlled tags: an external embedding /
-- RAG step (planned, not built here) will index these descriptions
-- so "software to automate hospital scheduling" resolves to
-- sector=health, use_case=clinical_workflow, etc. Keep descriptions
-- rich enough for that. Vectors will live in a separate store; no
-- embedding column is added here yet.
-- NO FK from sector/use_case text fields to this table (composite
-- (dimension, code) key + soft delete make FKs awkward). The app
-- layer MUST enforce: only write values that exist here as an active
-- (is_active, not-deleted) code for that dimension.
-- ------------------------------------------------------------
CREATE TABLE taxonomy_terms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension    text NOT NULL,               -- 'sector' | 'use_case' | 'archetype' | ...
  code         text NOT NULL,               -- e.g. 'enterprise_software'
  label        text NOT NULL,               -- e.g. 'Enterprise Software'
  description  text,
  parent_code  text,
  aliases      jsonb NOT NULL DEFAULT '[]',
  is_active    boolean NOT NULL DEFAULT true,
  version      int NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE UNIQUE INDEX idx_taxonomy_dim_code
  ON taxonomy_terms(dimension, code) WHERE deleted_at IS NULL;
CREATE INDEX idx_taxonomy_dimension
  ON taxonomy_terms(dimension) WHERE is_active AND deleted_at IS NULL;

-- ============================================================
-- LAYER 2 — PROFILES & CANONICAL ENTITIES
-- ============================================================

-- ------------------------------------------------------------
-- user_profiles
-- App-level profile of a registered user, 1:1 with "user".
-- Better Auth's table stays auth-only; product data lives here.
-- The user's PERSON node in the graph is contacts (via user_id).
-- Name is first/last with a generated full_name (matches contacts
-- and the LinkedIn export); location is split into country/state/
-- city for filtering and ANZ segmentation.
-- ------------------------------------------------------------
CREATE TABLE user_profiles (
  user_id             text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  first_name          text,
  last_name           text,
  full_name           text GENERATED ALWAYS AS
                        (trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))) STORED,
  linkedin_url        text,
  phone               text,
  role_at_company     text,           -- founder | ceo | cto | operator...
  bio                 text,
  country             text,           -- ISO country code, e.g. 'AU'
  state               text,           -- state / region, e.g. 'SA'
  city                text,
  onboarding_status   text NOT NULL DEFAULT 'new'
    CONSTRAINT chk_user_profiles_onboarding
    CHECK (onboarding_status IN ('new','profile_done','company_done','complete')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

-- ------------------------------------------------------------
-- company_profiles
-- The founder's company — STABLE facts only: identity, website,
-- LinkedIn, description, HQ address. Fundraise/matching data lives
-- in company_matching_profiles; documents in company_documents.
-- HQ address is split to street level (investors care about HQ and
-- ANZ segmentation needs country/state); address_full is generated.
-- ------------------------------------------------------------
CREATE TABLE company_profiles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id      text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  name               text NOT NULL,
  website_url        text,
  linkedin_url       text,
  one_liner          text,           -- one-sentence positioning (cards, match summary)
  description        text,           -- full company description
  hq_country         text,           -- ISO country code, e.g. 'AU'
  hq_state           text,           -- state / region, e.g. 'SA'
  hq_city            text,
  hq_street          text,
  hq_postal_code     text,
  hq_address_full    text GENERATED ALWAYS AS (
                       coalesce(hq_street || ', ', '') ||
                       coalesce(hq_city || ', ', '') ||
                       coalesce(hq_state || ', ', '') ||
                       coalesce(hq_postal_code || ', ', '') ||
                       coalesce(hq_country, '')
                     ) STORED,
  founded_year       int,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

-- One founder = one active company profile: /company-profile is a
-- singular resource, so the repository upserts by owner_user_id rather
-- than picking "the most recent row" among several.
CREATE UNIQUE INDEX idx_company_profiles_owner_unique
  ON company_profiles(owner_user_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- company_matching_profiles
-- MUTABLE matching input, separate from the company record. One
-- row per fundraise/matching context (seed profile now, Series A
-- profile next year). is_current marks the active one. label is
-- auto-generated (stage + creation year), not user-filled, for a
-- consistent format. Matching runs reference this and still freeze
-- a JSONB snapshot.
-- ------------------------------------------------------------
CREATE TABLE company_matching_profiles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_profile_id uuid NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  label              text,           -- auto-generated: "<Company> — <Stage> <year>"
  stage              funding_stage,
  -- founder's own company: single focused classification (a healthy
  -- startup has one clear core, unlike investee EVIDENCE samples
  -- which carry secondary dimensions)
  sector_primary     text,           -- taxonomy_terms (dimension='sector')
  use_case_primary   text,           -- taxonomy_terms (dimension='use_case')
  customer_type      customer_type,
  business_model     business_model_type,
  sales_motion       sales_motion_type,
  technology_depth   technology_depth_type,
  ai_relevance       ai_relevance_type NOT NULL DEFAULT 'unknown',  -- modifier, never a sector
  target_geographies jsonb NOT NULL DEFAULT '[]',
  raise_amount_min   numeric(16,2),
  raise_amount_max   numeric(16,2),
  raise_currency     char(3) DEFAULT 'AUD',
  notes              text,
  is_current         boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

CREATE INDEX idx_matching_profiles_company
  ON company_matching_profiles(company_profile_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_matching_profiles_current
  ON company_matching_profiles(company_profile_id)
  WHERE is_current AND deleted_at IS NULL;
-- App must flip the old current to false in the SAME transaction
-- before inserting a new is_current=true row, or this unique index
-- rejects the insert.

-- ------------------------------------------------------------
-- company_documents
-- Founder-uploaded files: pitch deck, one-pager, financial model.
-- storage_key points to blob storage; DB stores metadata + parse
-- state. content_hash (sha256 of the file) blocks re-uploading the
-- same file to the same company. matching_profile_id records which
-- profile was extracted from which document.
-- ------------------------------------------------------------
CREATE TABLE company_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_profile_id  uuid NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  uploaded_by_user_id text NOT NULL REFERENCES "user"("id"),
  file_type           text NOT NULL DEFAULT 'other'
    CONSTRAINT chk_company_documents_file_type
    CHECK (file_type IN ('pitch_deck','one_pager','financial_model','other')),
  original_filename   text NOT NULL,
  storage_key         text NOT NULL,
  content_hash        text,              -- sha256 of file bytes; blocks re-uploading the same file
  mime_type           text,
  file_size_bytes     bigint,
  parse_status        text NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_company_documents_parse_status
    CHECK (parse_status IN ('pending','parsing','parsed','failed')),
  extracted_text_ref  text,
  matching_profile_id uuid REFERENCES company_matching_profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE UNIQUE INDEX idx_company_documents_storage_key
  ON company_documents(storage_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_company_documents_content_hash
  ON company_documents(company_profile_id, content_hash)
  WHERE content_hash IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_documents_company
  ON company_documents(company_profile_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- contacts
-- Canonical PERSON entity — every human node in the graph.
-- PUBLIC IDENTITY: name, LinkedIn URL, current company/position
-- (all visible on a public LinkedIn profile). No private per-user
-- data here — what a user privately asserts about a relationship
-- lives on the edge (contact_relationships.asserted_by_user_id).
-- linkedin_url must be normalised to a canonical form
-- (https://www.linkedin.com/in/<slug>, no trailing slash / query)
-- in the import pipeline BEFORE insert; the unique index on
-- lower(linkedin_url) is the final guard. LinkedIn URL is the
-- identity key linking a contact to investor_team_members.
-- Role projections:
--   registered user  : contacts.user_id -> "user"(id)
--   fund team member : investor_team_members.contact_id -> contacts(id)
-- ------------------------------------------------------------
CREATE TABLE contacts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name          text NOT NULL,
  last_name           text,
  full_name           text GENERATED ALWAYS AS
                        (trim(first_name || ' ' || coalesce(last_name, ''))) STORED,
  linkedin_url        text,           -- normalised canonical form; unique
  company             text,           -- public: current company (from LinkedIn)
  position            text,           -- public: current title (from LinkedIn)
  user_id             text REFERENCES "user"("id") ON DELETE SET NULL,
  status              text NOT NULL DEFAULT 'active'
    CONSTRAINT chk_contacts_status CHECK (status IN ('active','merged','duplicate')),
  merged_into_id      uuid REFERENCES contacts(id),
  source              text,   -- user_registration | manual | linkedin_import | team_extraction
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE UNIQUE INDEX idx_contacts_linkedin
  ON contacts (lower(linkedin_url))
  WHERE linkedin_url IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_contacts_user
  ON contacts (user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_contacts_name
  ON contacts (lower(full_name)) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- investors
-- Canonical investor ORGANISATION entity. All evidence, derived
-- preferences and recommendations FK here. Entity resolution keys,
-- in priority order: website_url and linkedin_url (unique, the
-- reliable identity keys), then canonical_name + aliases as a
-- fallback for records without a URL. website_url / linkedin_url
-- must be normalised before insert (lower, strip trailing slash /
-- query / www) so the unique index catches variants.
-- All investors in the DB are ANZ-focused by intake filter, so no
-- ANZ flag is stored. Current review state is denormalised here;
-- full history in preference_review_history.
-- ------------------------------------------------------------
CREATE TABLE investors (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name      text NOT NULL,
  aliases             jsonb NOT NULL DEFAULT '[]',
  investor_type       investor_type NOT NULL DEFAULT 'vc_fund',
  website_url         text,
  linkedin_url        text,
  hq_country          text,
  hq_state            text,
  hq_city             text,
  -- additional offices; hq_* above is the primary one kept flat for
  -- filtering. Each entry: {"label","country","state","city",
  -- "address","emails":[],"phone","application_url"}. The reviewed,
  -- stable contact record, built from investor_web_profiles
  -- snapshots. Display-only, not used in structured matching.
  offices             jsonb NOT NULL DEFAULT '[]',
  status              text NOT NULL DEFAULT 'active'
    CONSTRAINT chk_investors_status
    CHECK (status IN ('active','inactive','merged','duplicate')),
  merged_into_id      uuid REFERENCES investors(id),
  review_status       review_status NOT NULL DEFAULT 'unreviewed',
  last_reviewed_at    timestamptz,
  last_reviewed_by    text REFERENCES "user"("id"),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE UNIQUE INDEX idx_investors_website
  ON investors (lower(website_url))
  WHERE website_url IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_investors_linkedin
  ON investors (lower(linkedin_url))
  WHERE linkedin_url IS NOT NULL AND deleted_at IS NULL;
-- name is a fallback identity only (same-name funds can exist), so
-- it is a plain lookup index, NOT unique — dedup relies on the URLs
CREATE INDEX idx_investors_canonical_name
  ON investors (lower(canonical_name)) WHERE deleted_at IS NULL;
CREATE INDEX idx_investors_hq_country
  ON investors(hq_country) WHERE deleted_at IS NULL;
CREATE INDEX idx_investors_review_status
  ON investors(review_status) WHERE deleted_at IS NULL;

-- ============================================================
-- LAYER 2b — CONTACT IMPORT HISTORY (CSV upload audit)
-- ============================================================

-- ------------------------------------------------------------
-- contact_import_batches
-- One CSV upload: file metadata, source format, processing status
-- and counts. Powers the import-history UI (which file, how many
-- contacts imported/merged/failed) and lets a failed batch be
-- re-run. Rows are resolved straight into contacts; raw per-row
-- data is not retained.
-- ------------------------------------------------------------
CREATE TABLE contact_import_batches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  filename       text,
  source_type    text NOT NULL DEFAULT 'generic_csv',  -- linkedin_export | google_contacts | generic_csv
  row_count      int NOT NULL DEFAULT 0,
  imported_count int NOT NULL DEFAULT 0,
  merged_count   int NOT NULL DEFAULT 0,
  failed_count   int NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_import_batches_status
    CHECK (status IN ('pending','processing','completed','failed')),
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  deleted_at     timestamptz
);

CREATE INDEX idx_import_batches_user
  ON contact_import_batches(user_id, created_at DESC) WHERE deleted_at IS NULL;

-- ============================================================
-- LAYER 3 — RAW EVIDENCE
-- ============================================================

-- ------------------------------------------------------------
-- investor_web_profiles
-- AI-extracted snapshot of an investor's website: what they CLAIM.
-- Focuses on site-only info (thesis, claimed stages/sectors,
-- contact, application URL) — team data lives in
-- investor_team_members and portfolio comes from real deals, so
-- neither is duplicated here. Multiple historical snapshots;
-- is_current marks latest. website_status separates "site
-- unreachable / thin content" from "extraction found nothing".
-- ------------------------------------------------------------
CREATE TABLE investor_web_profiles (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id              uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  -- provenance
  source_urls              jsonb NOT NULL DEFAULT '[]',
  retrieved_at             timestamptz NOT NULL,
  website_status           text NOT NULL DEFAULT 'ok'
    CONSTRAINT chk_web_profiles_website_status
    CHECK (website_status IN ('ok','unavailable','redirected','minimal_content','blocked','failed')),
  raw_content_hash         text,
  raw_content_ref          text,
  extraction_model         text,
  extraction_version       text,
  confidence               extraction_confidence NOT NULL DEFAULT 'medium',
  -- claimed profile (what the site SAYS — for claimed-vs-actual
  -- comparison only; matching uses deal-derived values instead)
  claimed_thesis           text,
  claimed_stages           jsonb NOT NULL DEFAULT '[]',
  claimed_sectors          jsonb NOT NULL DEFAULT '[]',
  claimed_geographies      jsonb NOT NULL DEFAULT '[]',
  claimed_business_models  jsonb NOT NULL DEFAULT '[]',
  claimed_cheque_min       numeric(16,2),   -- often inaccurate; claims-only
  claimed_cheque_max       numeric(16,2),   -- real cheque size comes from deals
  claimed_cheque_currency  char(3),
  -- contact & process — the raw contact info as seen at this
  -- retrieval (evidence snapshot). The reviewed, stable version
  -- lives in investors.offices; this is the source it's built from.
  contact_emails           jsonb NOT NULL DEFAULT '[]',
  application_url          text,
  contact_notes            text,
  is_current               boolean NOT NULL DEFAULT true,
  superseded_at            timestamptz,   -- set when a newer snapshot replaces this one
  created_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz
);

CREATE INDEX idx_web_profiles_investor
  ON investor_web_profiles(investor_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_web_profiles_current
  ON investor_web_profiles(investor_id)
  WHERE is_current AND deleted_at IS NULL;
-- App must flip the old current to false in the SAME transaction
-- before inserting a new is_current=true snapshot, or this unique
-- index rejects the insert.

-- ------------------------------------------------------------
-- investor_team_members
-- A person's ROLE at an investor org, extracted from the fund's
-- site — the SOURCE from which contacts (the graph's person nodes)
-- are derived. contact_id links back to the derived node once
-- created. Name is split first/last to match contacts. No personal
-- email stored (private); the fund's general contact lives in
-- investor_web_profiles / investors.offices. LinkedIn URL is the
-- identity key; full_name is display + fallback matching only.
-- ------------------------------------------------------------
CREATE TABLE investor_team_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id      uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  contact_id       uuid REFERENCES contacts(id) ON DELETE SET NULL,
  first_name       text NOT NULL,
  last_name        text,
  full_name        text GENERATED ALWAYS AS
                     (trim(first_name || ' ' || coalesce(last_name, ''))) STORED,
  role_title       text,
  seniority        text
    CONSTRAINT chk_team_member_seniority
    CHECK (seniority IN ('partner','principal','associate','analyst','operator','other')),
  linkedin_url     text,
  claimed_focus    jsonb NOT NULL DEFAULT '[]',
  bio_summary      text,
  source_url       text,
  retrieved_at     timestamptz,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);

CREATE UNIQUE INDEX idx_team_member_linkedin
  ON investor_team_members(investor_id, lower(linkedin_url))
  WHERE linkedin_url IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_team_members_investor
  ON investor_team_members(investor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_team_members_contact
  ON investor_team_members(contact_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- investee_company_profiles
-- AI-extracted profile of a funded company: what investees
-- ACTUALLY do. One row per company (multi-round companies share
-- one profile). ai_relevance is strictly a modifier.
-- ------------------------------------------------------------
CREATE TABLE investee_company_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  website_url         text,
  crunchbase_uuid     text,
  hq_country          text,
  hq_state            text,   -- geography can drive local-fund interest
  hq_city             text,
  is_anz              boolean,
  -- investees are EVIDENCE samples for inferring investor taste, so
  -- richer classification helps; primary is the main signal,
  -- secondary captures additional dimensions the company spans.
  sector_primary      text,   -- taxonomy_terms (dimension='sector'); never 'ai'
  sector_secondary    text,   -- taxonomy_terms (dimension='sector')
  use_case_primary    text,   -- taxonomy_terms (dimension='use_case')
  use_case_secondary  jsonb NOT NULL DEFAULT '[]',
  customer_type       customer_type,        -- single value (customers converge)
  business_model      business_model_type,  -- single value
  sales_motion        sales_motion_type,    -- single value
  technology_depth    technology_depth_type,
  -- AI as a modifier, split three ways (never a primary sector)
  ai_relevance        ai_relevance_type NOT NULL DEFAULT 'unknown',
  ai_usage_type       ai_usage_type NOT NULL DEFAULT 'unknown',
  ai_core_or_enabler  ai_core_or_enabler_type NOT NULL DEFAULT 'unclear',
  company_summary     text,
  -- provenance (raw evidence — quality is captured by confidence,
  -- not human review; archetypes are inferred downstream on the
  -- investor preference table, not tagged on each company)
  source_urls         jsonb NOT NULL DEFAULT '[]',
  retrieved_at        timestamptz,
  raw_content_hash    text,
  extraction_model    text,
  extraction_version  text,
  confidence          extraction_confidence NOT NULL DEFAULT 'medium',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE UNIQUE INDEX idx_investee_crunchbase
  ON investee_company_profiles (crunchbase_uuid)
  WHERE crunchbase_uuid IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_investee_name_site
  ON investee_company_profiles (lower(name), lower(coalesce(website_url, '')))
  WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- funding_rounds
-- Funding round evidence from Crunchbase's "Funding Rounds" CSV
-- export (one row per round). Columns mirror the export so import
-- is near zero-transform; *_raw fields keep the CSV's original
-- strings, structured fields hold parsed values, and source_payload
-- stores the whole row as a fallback for re-parsing later.
-- Provider-agnostic for the future (PitchBook / Dealroom / manual).
-- Dedup:
--   provider rounds : (source_provider, source_record_id)  -- Transaction Name
--   others          : (source_provider, dedupe_key)        -- app-built hash
-- Investors are kept as raw comma-joined strings here and resolved
-- into deal_investors; Lead vs all gives the lead/participant role.
-- Treated as evidence, not final truth.
-- ------------------------------------------------------------
CREATE TABLE funding_rounds (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_provider        data_source_provider NOT NULL DEFAULT 'crunchbase',
  -- prefer a STABLE provider id (permalink / UUID / transaction URL)
  -- if the export has one. "Transaction Name" (e.g. "Series A -
  -- Everlab") is NOT reliably stable, so when only that is available
  -- leave this NULL and rely on dedupe_key instead.
  source_record_id       text,
  -- app-built stable hash when there's no reliable source id:
  --   provider + investee_name + round_stage + announced_date + amount
  dedupe_key             text,
  source_url             text,
  source_payload         jsonb NOT NULL DEFAULT '{}',  -- entire CSV row, fallback

  -- investee company
  investee_company_id    uuid REFERENCES investee_company_profiles(id),
  investee_name_raw      text NOT NULL,        -- "Organization Name"
  org_location_raw       text,                 -- "Organization Location" (city, state, country, region)
  org_website_raw        text,                 -- "Organization Website"
  org_industries_raw     text,                 -- "Organization Industries" (CB tags, comma-joined; raw reference)

  -- round classification
  round_type_raw         text,                 -- "Funding Type", e.g. "Series A", "Seed", "Pre Seed"
  round_stage            funding_stage NOT NULL DEFAULT 'unknown',  -- parsed from round_type_raw
  funding_stage_raw      text,                 -- "Funding Stage", e.g. "Early Stage Venture"
  announced_date         date,                 -- "Announced Date"

  -- money (Money Raised / valuations arrive with currency symbols like "A$65,000,000")
  money_raised_raw       text,                 -- original "Money Raised" string
  amount                 numeric(18,2),        -- parsed amount
  currency               char(3),              -- parsed currency (AUD/NZD/USD)
  amount_usd             numeric(18,2),        -- normalised
  pre_money_valuation_raw text,                -- "Pre-Money Valuation" (often "—")
  pre_money_valuation    numeric(18,2),
  valuation_currency     char(3),
  valuation_usd          numeric(18,2),
  equity_only            boolean,              -- "Equity Only Funding" (Yes/No)
  total_funding_raw      text,                 -- "Total Funding Amount" (company cumulative)

  -- investors (comma-joined in the CSV; resolved into deal_investors)
  investor_names_raw     text,                 -- "Investor Names" (all)
  lead_investor_names_raw text,                -- "Lead Investors"

  imported_at            timestamptz NOT NULL DEFAULT now(),
  import_batch_id        text,
  deleted_at             timestamptz
);

CREATE UNIQUE INDEX idx_funding_rounds_source_record
  ON funding_rounds(source_provider, source_record_id)
  WHERE source_record_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_funding_rounds_dedupe
  ON funding_rounds(source_provider, dedupe_key)
  WHERE dedupe_key IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_rounds_company
  ON funding_rounds(investee_company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rounds_stage_date
  ON funding_rounds(round_stage, announced_date DESC) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- deal_investors
-- Junction linking a funding round to the investors in it, one row
-- per (round, investor), with each investor's role. This is what
-- makes "how many seed rounds did X lead in 18 months" a clean SQL
-- aggregate and is the direct input to the derived preference
-- pipeline.
-- Resolution: the CSV gives comma-joined investor strings. Each is
-- kept in raw_name and resolved to an investors row. If it can't be
-- matched yet (e.g. an angel not in the DB), investor_id stays NULL
-- and resolution='unresolved' so no evidence is lost — it's
-- lead vs participant comes from whether the name appears in the
-- CSV's Lead Investors column (role); whether they're a new vs
-- existing/follow-on backer is a separate, orthogonal axis
-- (participation_status) — an investor can be lead + existing, or
-- participant + new, etc.
-- ------------------------------------------------------------
CREATE TABLE deal_investors (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id                uuid NOT NULL REFERENCES funding_rounds(id) ON DELETE CASCADE,
  investor_id            uuid REFERENCES investors(id) ON DELETE SET NULL,  -- NULL until resolved; SET NULL (not CASCADE) so deleting an investor keeps the deal evidence
  raw_name               text NOT NULL,        -- original CSV string, e.g. "Airtree Ventures"
  role                   deal_role NOT NULL DEFAULT 'unknown',
  participation_status   investor_participation_status NOT NULL DEFAULT 'unknown',
  resolution             text NOT NULL DEFAULT 'unresolved'
    CONSTRAINT chk_deal_investors_resolution
    CHECK (resolution IN ('unresolved','resolved','ambiguous','not_an_investor')),
  resolution_confidence  extraction_confidence NOT NULL DEFAULT 'medium',
  created_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz
);

-- one resolved investor appears once per round; unresolved rows
-- (investor_id NULL) are de-duped on the raw name instead
CREATE UNIQUE INDEX idx_deal_investors_pair
  ON deal_investors(deal_id, investor_id)
  WHERE investor_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_deal_investors_rawpair
  ON deal_investors(deal_id, lower(raw_name))
  WHERE investor_id IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_deal_investors_investor
  ON deal_investors(investor_id) WHERE deleted_at IS NULL;

-- ============================================================
-- LAYER 4 — DERIVED PREFERENCES (pipeline-generated caches;
-- regenerated from evidence, never hand-edited)
-- ============================================================

-- ------------------------------------------------------------
-- investor_actual_preferences
-- Investor-level rollup for EXPLANATION only: activity summary,
-- lead/participant ratios, claimed-vs-actual mismatch, overall
-- confidence. Aggregated from stage preferences. NOT the matching
-- table. NO soft delete — this is a derived cache, regenerated by
-- the pipeline via INSERT ... ON CONFLICT (investor_id) DO UPDATE.
-- WARNING: because there is no deleted_at here, EVERY query MUST
-- join live investors and filter i.deleted_at IS NULL — otherwise a
-- soft-deleted investor's stale cache row can leak into results.
-- ------------------------------------------------------------
CREATE TABLE investor_actual_preferences (
  investor_id            uuid PRIMARY KEY REFERENCES investors(id) ON DELETE CASCADE,
  total_deals_found      int NOT NULL DEFAULT 0,
  total_deals_used       int NOT NULL DEFAULT 0,
  deals_window_start     date,
  deals_window_end       date,
  stage_coverage         jsonb NOT NULL DEFAULT '{}',
  lead_ratio             numeric(5,4),
  participant_ratio      numeric(5,4),
  follow_on_ratio        numeric(5,4),
  activity_summary       text,
  overall_archetypes     jsonb NOT NULL DEFAULT '[]',
  claimed_vs_actual      jsonb NOT NULL DEFAULT '{}',
  data_quality           extraction_confidence NOT NULL DEFAULT 'medium',
  overall_confidence     numeric(5,4),
  pipeline_version       text,
  generated_at           timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- investor_actual_stage_preferences
-- THE primary matching table. One row per (investor, stage) —
-- pre-seed / seed / series A behaviour never merged.
-- dimension_distributions = evidence statistics per dimension;
-- actual_archetypes = interpreted pattern with weights + backing
-- deal ids. no_evidence separates "no data" from negative fit.
-- ------------------------------------------------------------
CREATE TABLE investor_actual_stage_preferences (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id             uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  stage                   funding_stage NOT NULL,
  deals_count             int NOT NULL DEFAULT 0,
  deals_window_start      date,
  deals_window_end        date,
  -- per dimension, two layers:
  --   raw:      per-code {as_primary, as_secondary} counts kept
  --             SEPARATE. This split is required for scoring: a
  --             primary hit (as_primary>0 = investor has invested in
  --             this as a company's CORE) is the hard signal; a
  --             secondary-only code (as_primary=0) can never be
  --             promoted to a strong match on its own. It also lets
  --             the secondary discount be re-tuned without touching
  --             deals.
  --   weighted: normalized preference weights summing to 1, computed
  --             as as_primary*1.0 + as_secondary*k then normalized —
  --             a code that only ever appears as secondary is pushed
  --             down, so secondary never overrides primary. This is
  --             the vector matched (cosine/dot) against the founder's
  --             RAG weighted intent from matching_runs.
  -- e.g. {"sector": {
  --         "raw": {"enterprise_software": {"as_primary":6,"as_secondary":3},
  --                 "fintech": {"as_primary":1,"as_secondary":5}},
  --         "weighted": {"enterprise_software":0.73,"fintech":0.27}}}
  -- k (secondary discount) is a pipeline parameter (pipeline_version).
  dimension_distributions jsonb NOT NULL DEFAULT '{}',
  actual_archetypes       jsonb NOT NULL DEFAULT '[]',
  lead_count              int NOT NULL DEFAULT 0,
  participant_count       int NOT NULL DEFAULT 0,
  leads_at_this_stage     boolean,
  cheque_size_min_usd     numeric(18,2),
  cheque_size_max_usd     numeric(18,2),
  cheque_size_confidence  extraction_confidence NOT NULL DEFAULT 'low',
  recent_activity_score   numeric(5,4),
  matching_notes          text,
  evidence_refs           jsonb NOT NULL DEFAULT '[]',
  no_evidence             boolean NOT NULL DEFAULT false,
  data_quality            extraction_confidence NOT NULL DEFAULT 'medium',
  pipeline_version        text,
  generated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz
);

CREATE UNIQUE INDEX idx_stage_prefs_investor_stage
  ON investor_actual_stage_preferences(investor_id, stage)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_stage_prefs_stage
  ON investor_actual_stage_preferences(stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_stage_prefs_distributions
  ON investor_actual_stage_preferences USING gin (dimension_distributions)
  WHERE deleted_at IS NULL;

-- ============================================================
-- LAYER 5 — MATCHING
-- ============================================================

-- ------------------------------------------------------------
-- matching_runs
-- One matching request. founder_profile_snapshot is frozen JSONB;
-- it captures the founder's single-value profile AND the RAG-derived
-- weighted intent vector used for THIS run (e.g. sector {ent_sw:0.6,
-- fintech:0.3, health:0.1}). The vector is not stored on the founder
-- profile (which stays single-value/focused) — it lives only in this
-- run snapshot, so a recommendation stays explainable later.
-- algorithm/scoring/prompt versions make every run reproducible even
-- after the profile is edited.
-- ------------------------------------------------------------
CREATE TABLE matching_runs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   text NOT NULL REFERENCES "user"("id"),
  company_profile_id        uuid REFERENCES company_profiles(id),
  matching_profile_id       uuid REFERENCES company_matching_profiles(id),
  matching_mode             text NOT NULL DEFAULT 'standard',
  founder_profile_snapshot  jsonb NOT NULL,
  target_stage              funding_stage,
  target_geographies        jsonb NOT NULL DEFAULT '[]',
  target_filters            jsonb NOT NULL DEFAULT '{}',
  algorithm_version         text NOT NULL,
  scoring_version           text NOT NULL,
  prompt_version            text,
  status                    run_status NOT NULL DEFAULT 'pending',
  result_count              int,
  error_message             text,
  started_at                timestamptz,
  completed_at              timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz
);

CREATE INDEX idx_matching_runs_user
  ON matching_runs(user_id, created_at DESC) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- matching_recommendations
-- One recommended investor within a run (run 1:N recs): rank,
-- per-dimension score breakdown, matched archetypes, strong/weak
-- reasons, risk flags, RAG explanation, evidence refs — every
-- recommendation is auditable.
-- ------------------------------------------------------------
CREATE TABLE matching_recommendations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matching_run_id     uuid NOT NULL REFERENCES matching_runs(id) ON DELETE CASCADE,
  investor_id         uuid NOT NULL REFERENCES investors(id),
  stage_preference_id uuid REFERENCES investor_actual_stage_preferences(id) ON DELETE SET NULL,
  rank                int NOT NULL,
  score               numeric(7,4) NOT NULL,
  match_tier          text
    CONSTRAINT chk_rec_match_tier
    CHECK (match_tier IN ('strong','good','speculative')),
  -- per-dimension score breakdown. Records BOTH signals per
  -- dimension so a score is fully explainable:
  --   primary_hit   : did the founder's tag hit the investor's
  --                   as_primary>0 (hard signal)?
  --   weighted_sim  : similarity between founder intent vector and
  --                   the investor's weighted distribution (soft)?
  -- e.g. {"sector":  {"primary_hit": true,  "weighted_sim": 0.82, "score": 0.9},
  --       "use_case":{"primary_hit": false, "weighted_sim": 0.40, "score": 0.3},
  --       "stage":   {"hit": true, "score": 1.0},
  --       "geography": {...}, "cheque": {...}}
  score_breakdown     jsonb NOT NULL DEFAULT '{}',
  matched_archetypes  jsonb NOT NULL DEFAULT '[]',
  matched_reasons     jsonb NOT NULL DEFAULT '[]',
  weak_reasons        jsonb NOT NULL DEFAULT '[]',
  risk_flags          jsonb NOT NULL DEFAULT '[]',
  explanation         text,
  evidence_refs       jsonb NOT NULL DEFAULT '[]',
  user_note           text,
  status              recommendation_status NOT NULL DEFAULT 'new',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE UNIQUE INDEX idx_recs_run_investor
  ON matching_recommendations(matching_run_id, investor_id)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_recs_run_rank
  ON matching_recommendations(matching_run_id, rank)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_recommendations_investor
  ON matching_recommendations(investor_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- user_shortlisted_investors
-- User-owned saved investors. This is product state, not matching
-- evidence: a user can save an investor from the directory, a match
-- detail page, or a full VC profile and later review one consolidated
-- shortlist.
-- ------------------------------------------------------------
CREATE TABLE user_shortlisted_investors (
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

CREATE INDEX idx_user_shortlisted_investors_user
  ON user_shortlisted_investors(user_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_user_shortlisted_investors_investor
  ON user_shortlisted_investors(investor_id)
  WHERE deleted_at IS NULL;

-- ============================================================
-- LAYER 6 — REVIEW / AUDIT
-- ============================================================

-- ------------------------------------------------------------
-- preference_review_history
-- Append-only audit log of human review of the DERIVED investor
-- preferences (the only thing that's actually reviewed — raw
-- evidence isn't). Points at a stage preference row (or the
-- investor-level rollup when stage_preference_id is null).
-- old_value/new_value capture what a reviewer corrected; the
-- current reviewed state is denormalised onto investors.review_status.
-- ------------------------------------------------------------
CREATE TABLE preference_review_history (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id          uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  stage_preference_id  uuid REFERENCES investor_actual_stage_preferences(id) ON DELETE SET NULL,  -- null = investor-level rollup; SET NULL (not CASCADE) so the audit trail survives recompute/delete of the reviewed preference
  reviewer_id          text NOT NULL REFERENCES "user"("id"),
  action               review_action NOT NULL,
  issue_type           text,   -- wrong_archetype | wrong_stage | wrong_cheque | weak_evidence | ...
  severity             text,   -- low | medium | high | critical
  old_value            jsonb,
  new_value            jsonb,
  notes                text,
  evidence_urls        jsonb NOT NULL DEFAULT '[]',
  created_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz
);

CREATE INDEX idx_pref_review_investor
  ON preference_review_history(investor_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_pref_review_stage_pref
  ON preference_review_history(stage_preference_id) WHERE deleted_at IS NULL;

-- ============================================================
-- LAYER 7 — RELATIONSHIP GRAPH (edges; nodes are contacts)
-- Warm-intro features are post-MVP; schema ships now so FKs are
-- stable. Set relationship signal weight to 0 until activated.
-- ============================================================

-- ------------------------------------------------------------
-- contact_relationships
-- Generic person<->person edges. A user's network = edges touching
-- their own contacts node. asserted_by_user_id is provenance AND
-- the privacy boundary: privately asserted edges surface only for
-- that user; NULL = system-derived. Symmetric edges stored once
-- with from_id < to_id (app-enforced).
-- ------------------------------------------------------------
CREATE TABLE contact_relationships (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_contact_id      uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  to_contact_id        uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  relationship_type    text NOT NULL,  -- knows | friend | former_colleague | classmate | advisor_of | invested_in | introduced_by
  is_directional       boolean NOT NULL DEFAULT false,
  strength             smallint CHECK (strength BETWEEN 1 AND 5),
  how_known            text,
  last_interaction_at  date,
  notes                text,
  asserted_by_user_id  text REFERENCES "user"("id") ON DELETE CASCADE,  -- NULL = system-derived
  visibility           text NOT NULL DEFAULT 'private'
    CONSTRAINT chk_rel_visibility CHECK (visibility IN ('private','shared','system')),
  -- MVP: visibility is scoped to the asserting user only. If team
  -- workspaces arrive (Torus), "shared" will need a workspace_id or
  -- a separate relationship-permissions table to say shared-with-whom.
  confidence           extraction_confidence NOT NULL DEFAULT 'medium',
  source               text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz,
  CHECK (from_contact_id <> to_contact_id),
  -- for non-directional edges force one canonical ordering so
  -- A->B and B->A can't both exist as duplicates
  CHECK (is_directional OR from_contact_id < to_contact_id)
);

CREATE UNIQUE INDEX idx_rel_edge
  ON contact_relationships(from_contact_id, to_contact_id, relationship_type,
                           coalesce(asserted_by_user_id, ''))
  WHERE deleted_at IS NULL;
CREATE INDEX idx_rel_from ON contact_relationships(from_contact_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rel_to ON contact_relationships(to_contact_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rel_asserted_by ON contact_relationships(asserted_by_user_id) WHERE deleted_at IS NULL;

-- ============================================================
-- updated_at trigger for mutable app tables
-- (Better Auth maintains updatedAt on its own tables)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Auto-generate company_matching_profiles.label on insert:
-- "<Company> — <Stage> <year>", e.g. "Acme — Seed 2026".
-- Company name is looked up from company_profiles; stage falls
-- back to "Matching" when null. Runs only on INSERT so an edited
-- stage doesn't silently rewrite the label.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_matching_profile_label() RETURNS trigger AS $$
DECLARE
  company_name text;
  stage_label  text;
BEGIN
  IF NEW.label IS NULL THEN
    SELECT name INTO company_name
      FROM company_profiles WHERE id = NEW.company_profile_id;

    stage_label := CASE NEW.stage
      WHEN 'pre_seed'      THEN 'Pre-Seed'
      WHEN 'seed'          THEN 'Seed'
      WHEN 'series_a'      THEN 'Series A'
      WHEN 'series_b'      THEN 'Series B'
      WHEN 'series_c_plus' THEN 'Series C+'
      WHEN 'growth'        THEN 'Growth'
      WHEN 'bridge'        THEN 'Bridge'
      ELSE 'Matching'
    END;

    NEW.label := coalesce(company_name, 'Company') || ' — '
                 || stage_label || ' '
                 || to_char(now(), 'YYYY');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_matching_profile_label
  BEFORE INSERT ON company_matching_profiles
  FOR EACH ROW EXECUTE FUNCTION set_matching_profile_label();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_profiles','company_profiles','company_matching_profiles',
    'company_documents','contacts','invitations','contact_import_batches',
    'taxonomy_terms',
    'investors','investor_team_members','investee_company_profiles',
    'matching_runs','matching_recommendations','contact_relationships'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- ============================================================
-- DONE — 24 tables total:
--   5 auth/access: user, session, account, verification, invitations
--  19 application: taxonomy_terms, user_profiles, company_profiles,
--     company_matching_profiles, company_documents, contacts,
--     contact_import_batches, investors, investor_web_profiles,
--     investor_team_members, investee_company_profiles,
--     funding_rounds, deal_investors, investor_actual_preferences,
--     investor_actual_stage_preferences, matching_runs,
--     matching_recommendations, preference_review_history,
--     contact_relationships
--
-- All application tables use soft delete (deleted_at) with partial
-- unique indexes (WHERE deleted_at IS NULL), EXCEPT
-- investor_actual_preferences — a derived cache maintained by
-- INSERT ... ON CONFLICT (investor_id) DO UPDATE.
-- Stable status fields are guarded by named CHECK constraints.
-- ============================================================

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

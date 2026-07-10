-- Local docker bootstrap: seed one admin account into the formal public schema.
--
-- Purpose: give the future invite-only registration flow an existing admin
-- who can be the `invited_by` for test invitations. This is data-only —
-- no Better Auth wiring, login route, or credential/account row yet. That
-- comes in a later round once the auth approach is decided.

INSERT INTO public."user" (
  id,
  name,
  email,
  "emailVerified",
  role
)
VALUES (
  'admin-seed-001',
  'Rally Admin',
  'admin@rally.local',
  true,
  'admin'
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  "emailVerified" = EXCLUDED."emailVerified",
  "updatedAt" = now();

INSERT INTO public.user_profiles (
  user_id,
  first_name,
  last_name,
  role_at_company,
  country,
  state,
  city,
  onboarding_status
)
VALUES (
  'admin-seed-001',
  'Rally',
  'Admin',
  'operator',
  'AU',
  'NSW',
  'Sydney',
  'complete'
)
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role_at_company = EXCLUDED.role_at_company,
  country = EXCLUDED.country,
  state = EXCLUDED.state,
  city = EXCLUDED.city,
  onboarding_status = EXCLUDED.onboarding_status,
  updated_at = now();

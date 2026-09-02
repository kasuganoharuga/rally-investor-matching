-- Additive: contains only short-lived HMAC hashes and counters, never credentials.
BEGIN;
CREATE TABLE IF NOT EXISTS public.registration_rate_limits (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_registration_rate_limits_window
  ON public.registration_rate_limits(window_start);
COMMIT;

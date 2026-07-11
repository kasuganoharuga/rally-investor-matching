import "server-only";

/**
 * Canonical form used for every email comparison/lookup on the server
 * (uniqueness checks, invitation matching, provisioning). Callers must
 * normalize before writing OR querying — the "user" table's unique
 * constraint is a plain case-sensitive UNIQUE, not `lower(email)`.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

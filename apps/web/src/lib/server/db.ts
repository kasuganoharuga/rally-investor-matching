import "server-only";

/**
 * Shared PostgreSQL access helpers for Next.js product data.
 * Repositories should depend on this module, not open connections directly.
 */
export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  return databaseUrl;
}

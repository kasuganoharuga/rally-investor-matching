import "server-only";

import { Pool, type PoolClient } from "pg";

/**
 * Shared PostgreSQL access helpers for Next.js product data.
 * Repositories should depend on this module, not open connections directly.
 */

// `next build` imports route modules (e.g. the Better Auth handler) to
// inspect their exports/config, which runs this module's top-level code
// without ever executing a request. `pg.Pool` itself never connects until a
// query runs, so a placeholder here is safe: it only unblocks that static
// analysis step. Real environments always set DATABASE_URL before `next
// build`/`next start` run, so this never masks a genuine misconfiguration.
const BUILD_PLACEHOLDER_DATABASE_URL =
  "postgresql://build:build@localhost:5432/build_placeholder";

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return databaseUrl;
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return BUILD_PLACEHOLDER_DATABASE_URL;
  }
  throw new Error("DATABASE_URL is not configured");
}

let pool: Pool | undefined;

function shouldUseUnverifiedSsl(databaseUrl: string): boolean {
  return (
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("sslmode=no-verify") ||
    databaseUrl.includes(".rds.amazonaws.com")
  );
}

function getPoolConfig(databaseUrl: string): ConstructorParameters<typeof Pool>[0] {
  if (!shouldUseUnverifiedSsl(databaseUrl)) {
    return { connectionString: databaseUrl };
  }

  const parsedUrl = new URL(databaseUrl);
  parsedUrl.searchParams.delete("sslmode");
  parsedUrl.searchParams.delete("uselibpqcompat");

  return {
    connectionString: parsedUrl.toString(),
    ssl: { rejectUnauthorized: false },
  };
}

/**
 * Singleton pool, lazily created on first use so importing this module
 * never opens a connection by itself (e.g. during build or tests).
 */
export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = getDatabaseUrl();
    pool = new Pool(getPoolConfig(databaseUrl));
  }
  return pool;
}

/**
 * Anything that can run a parameterized query: the pool itself, or a
 * client checked out for a transaction. Repository/service functions
 * that need to participate in a caller's transaction accept this type
 * instead of hard-coding `Pool`.
 */
export type Queryable = Pick<Pool | PoolClient, "query">;

/**
 * Runs `fn` inside a single transaction on one connection. Rolls back and
 * rethrows on any error; the rollback failure itself is swallowed so it
 * never hides the original error.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Do not let a rollback failure hide the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}

type PostgresError = Error & { code: string; constraint?: string };

export function isPostgresError(error: unknown): error is PostgresError {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

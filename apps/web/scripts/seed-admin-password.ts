/**
 * Entry point for `pnpm run seed:admin`. Loads apps/web/.env.local
 * before anything else is imported — seed-admin.ts and everything it
 * pulls in read env vars (DATABASE_URL, BETTER_AUTH_SECRET) at module
 * scope, so they must only be imported after this runs.
 *
 * The npm script runs this under `tsx --conditions=react-server`: our
 * server-only modules import the "server-only" marker package, which
 * always throws under plain Node unless the "react-server" export
 * condition is active (normally supplied by Next.js's bundler).
 */
import { loadEnvConfig } from "@next/env";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const { runAdminSeed } = await import("./seed-admin");
  await runAdminSeed();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

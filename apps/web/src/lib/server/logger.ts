import "server-only";

import type { SafeLoggerContext } from "@/lib/api/errors";

/**
 * Structured server logging. `context` is intentionally typed as the
 * whitelisted SafeLoggerContext (not `unknown`/`Record<string, unknown>`)
 * so callers can't accidentally log PII (email, password, raw error
 * objects) — only ids, enums, and request metadata are accepted.
 */
export const logger = {
  info(event: string, context: SafeLoggerContext = {}): void {
    console.log(JSON.stringify({ level: "info", event, ...context }));
  },
  warn(event: string, context: SafeLoggerContext = {}): void {
    console.warn(JSON.stringify({ level: "warn", event, ...context }));
  },
  error(event: string, context: SafeLoggerContext = {}): void {
    console.error(JSON.stringify({ level: "error", event, ...context }));
  },
};

/**
 * The post-login redirect target comes from a `?from=` query param that
 * an attacker-shared link could set to an absolute/external URL. Only
 * accept single-leading-slash paths (rejecting `//host/...`, which
 * browsers treat as protocol-relative) so this can never send someone
 * off rallying.example to an attacker's site.
 */
export function getSafeRedirectTarget(from: string | null, fallback: string): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) {
    return from;
  }
  return fallback;
}

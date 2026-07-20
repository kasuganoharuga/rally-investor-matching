import "server-only";

import { randomBytes } from "node:crypto";

/**
 * Opaque bearer token embedded in an invitation link. Keep it high
 * entropy because possession of this value is what lets an invitee
 * complete account creation.
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

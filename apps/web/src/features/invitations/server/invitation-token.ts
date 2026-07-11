import "server-only";

import { randomBytes } from "node:crypto";

/**
 * `invitations.token` is NOT NULL and unique, purely for internal
 * audit — this round never emails a registration link or validates a
 * token from a client. The value just needs to satisfy the column
 * constraints and never collide in practice.
 */
export function generateInternalInvitationRecordToken(): string {
  return randomBytes(32).toString("hex");
}

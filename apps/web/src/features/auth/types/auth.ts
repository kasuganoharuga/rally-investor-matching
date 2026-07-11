import { z } from "zod";

/**
 * The three roles this app knows about. Stored as plain `text` in the
 * database (no CHECK constraint), so this schema is the only place
 * that enforces valid values — every read of "user".role or
 * invitations.role for app logic should parse through it.
 */
export const userRoleSchema = z.enum(["founder", "reviewer", "admin"]);

export type UserRole = z.infer<typeof userRoleSchema>;

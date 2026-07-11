import type { UserRole } from "@/features/auth/types/auth";

/**
 * Who each role is allowed to invite. Admins manage accounts overall;
 * reviewers can grow the founder/reviewer pool but not create other
 * admins. Pure data with no server dependency, so both the API
 * service and the client-side invite form can share one source of
 * truth instead of re-deriving these rules independently.
 */
const ALLOWED_INVITEE_ROLES: Record<UserRole, readonly UserRole[]> = {
  admin: ["founder", "reviewer", "admin"],
  reviewer: ["founder", "reviewer"],
  founder: [],
};

export function canInviteRole(inviterRole: UserRole, targetRole: UserRole): boolean {
  return ALLOWED_INVITEE_ROLES[inviterRole].includes(targetRole);
}

export function invitableRolesFor(inviterRole: UserRole): readonly UserRole[] {
  return ALLOWED_INVITEE_ROLES[inviterRole];
}

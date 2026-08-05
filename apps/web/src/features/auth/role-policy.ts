import type { UserRole } from "@/features/auth/types/auth";

const INTERNAL_ROLES: readonly UserRole[] = ["admin", "reviewer"];

/** Internal staff can access management tools and tune test-match scoring. */
export function isInternalUser(role: UserRole): boolean {
  return INTERNAL_ROLES.includes(role);
}

export const canAccessManagement = isInternalUser;
export const canConfigureMatching = isInternalUser;

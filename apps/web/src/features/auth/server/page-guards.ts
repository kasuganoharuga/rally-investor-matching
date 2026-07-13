import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "@/features/auth/server/session";
import type { UserRole } from "@/features/auth/types/auth";

/**
 * Page-level auth guard. Unlike requireUser() in session.ts, this redirects
 * instead of throwing an ApiError — pages render outside the request/
 * response cycle that turns ApiError into a JSON envelope, so an uncaught
 * throw would surface as a raw error screen instead of sending the visitor
 * to sign in. Every server-component page behind auth should call this (or
 * requirePageRole below) rather than repeating the getCurrentUser + redirect
 * check inline.
 */
export async function requirePageUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  return user;
}

/**
 * Page-level role guard built on requirePageUser(). Redirects viewers
 * without an allowed role to `fallbackHref` — the nearest page they can
 * actually see — instead of throwing, for the same reason
 * requirePageUser() redirects.
 */
export async function requirePageRole(
  allowedRoles: readonly UserRole[],
  fallbackHref: string,
): Promise<CurrentUser> {
  const user = await requirePageUser();
  if (!allowedRoles.includes(user.role)) {
    redirect(fallbackHref);
  }
  return user;
}

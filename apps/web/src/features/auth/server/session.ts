import "server-only";

import { headers } from "next/headers";

import { auth } from "@/features/auth/server/auth";
import { userRoleSchema, type UserRole } from "@/features/auth/types/auth";
import { ApiError } from "@/lib/api/errors";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

/**
 * Reads and validates the current session against the database (unlike
 * proxy.ts, which only checks whether a session cookie is present).
 * This is the actual security boundary — every protected page/route
 * calls this (or requireUser/requireInviter/requireAdmin below), never
 * the proxy alone.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }

  const roleResult = userRoleSchema.safeParse(session.user.role);
  if (!roleResult.success) {
    // Defensive: role is always written by our own databaseHooks, but a
    // read path should never trust a stored value blindly either.
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: roleResult.data,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError({
      code: "UNAUTHENTICATED",
      message: "Sign in required.",
      status: 401,
    });
  }
  return user;
}

/** Admins and reviewers can send invitations; founders cannot. */
export async function requireInviter(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "reviewer") {
    throw new ApiError({
      code: "FORBIDDEN",
      message: "Only admins and reviewers can send invitations.",
      status: 403,
    });
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new ApiError({
      code: "FORBIDDEN",
      message: "Admin access required.",
      status: 403,
    });
  }
  return user;
}

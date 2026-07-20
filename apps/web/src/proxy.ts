import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Everything except the "/" sign-in page is gated behind a session.
const PROTECTED_PATH_PREFIXES = [
  "/investors",
  "/match",
  "/admin",
  "/change-password",
  "/company-profile",
  "/settings",
  "/shortlist",
];

/**
 * Optimistic redirect only — checks whether a session cookie is
 * *present*, not whether it is valid. This is not the security
 * boundary: every protected page/route still calls requireUser() /
 * requireFounder() / requireInviter() / requireAdmin() itself, which
 * check the real session against the database.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Exact match or "prefix/" — a plain startsWith() would also match an
  // unrelated sibling path like "/settings-old".
  const isProtectedPath = PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/investors/:path*",
    "/match/:path*",
    "/admin/:path*",
    "/change-password",
    "/company-profile/:path*",
    "/settings/:path*",
    "/shortlist/:path*",
  ],
};

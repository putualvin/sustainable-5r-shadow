import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { emailToRoles, canAccess, sectionForPath } from "@/lib/rbac";

const COOKIE_NAME = "session_email";
const ROLES_COOKIE = "session_roles";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const email = request.cookies.get(COOKIE_NAME)?.value;
  const rolesRaw = request.cookies.get(ROLES_COOKIE)?.value;

  // Roles come from the cookie set at login (so the edge can authorise without
  // a DB call); fall back to the email prefix for older/virtual sessions.
  const roles: Role[] = rolesRaw
    ? (rolesRaw.split(",").filter(Boolean) as Role[])
    : email
      ? emailToRoles(email)
      : [];
  const loggedIn = roles.length > 0;

  const isLogin = pathname === "/login";

  // Not logged in → only /login allowed.
  if (!loggedIn) {
    if (isLogin) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged in but on /login → go home.
  if (isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Route guard by section (403 when no role grants access).
  const section = sectionForPath(pathname);
  if (section && !canAccess(roles, section)) {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  return NextResponse.next();
}

// Run on all routes except static assets, API, the 403 page, and the PWA entry
// points (service worker, manifest, icons, offline fallback) — these must be
// reachable without a session so install + offline work before/without login.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|403|offline|sw\\.js|manifest\\.webmanifest|.*\\.png).*)",
  ],
};

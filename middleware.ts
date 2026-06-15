import { NextRequest, NextResponse } from "next/server";
import { emailToRole, canAccess, sectionForPath } from "@/lib/rbac";

const COOKIE_NAME = "session_email";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const email = request.cookies.get(COOKIE_NAME)?.value;
  const role = email ? emailToRole(email) : null;
  const loggedIn = Boolean(role);

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

  // Route guard by section (403 when role lacks access).
  const section = sectionForPath(pathname);
  if (section && role && !canAccess(role, section)) {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  return NextResponse.next();
}

// Run on all routes except static assets, API, and the 403 page itself.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|403).*)"],
};

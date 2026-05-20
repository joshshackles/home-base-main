import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_ROUTE_PREFIXES } from "@/lib/security/protected-routes";

const SESSION_COOKIE = "homebase_mls_session";

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const isProtectedPath = PROTECTED_ROUTE_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (isProtectedPath && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Keep this literal for Next.js static matcher analysis. scripts/verify-middleware-static-matchers.ts
  // compares it with src/lib/security/protected-routes.ts so the runtime prefix manifest cannot drift.
  matcher: [
    "/admin/:path*",
    "/landlord/:path*",
    "/applicant/:path*",
    "/tenant/:path*",
    "/vendor/:path*",
    "/inspector/:path*",
    "/account/:path*",
    "/dashboard/:path*",
    "/documents/:path*"
  ]
};

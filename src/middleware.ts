import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "homebase_mls_session";
const protectedPrefixes = ["/admin", "/landlord", "/applicant", "/account"];

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const isProtectedPath = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (isProtectedPath && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/landlord/:path*", "/applicant/:path*", "/account/:path*"]
};

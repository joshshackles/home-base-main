export const PROTECTED_ROUTE_PREFIXES = [
  "/admin",
  "/landlord",
  "/applicant",
  "/tenant",
  "/vendor",
  "/inspector",
  "/account",
  "/dashboard",
  "/documents"
] as const;

export const PROTECTED_ROUTE_MATCHERS = [
  "/admin/:path*",
  "/landlord/:path*",
  "/applicant/:path*",
  "/tenant/:path*",
  "/vendor/:path*",
  "/inspector/:path*",
  "/account/:path*",
  "/dashboard/:path*",
  "/documents/:path*"
] as const;

export type ProtectedRoutePrefix = (typeof PROTECTED_ROUTE_PREFIXES)[number];

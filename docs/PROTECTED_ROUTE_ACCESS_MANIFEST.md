# Protected Route Access Manifest

HomeBase MLS uses two layers for private workspace protection:

1. Middleware blocks unauthenticated requests before private role workspaces render.
2. Server-side layouts, pages, actions, and API routes enforce the actual role, account-access, ownership, participant, and super-user rules.

Middleware is not the source of truth for authorization. It is an early session gate that improves user experience and reduces accidental private page exposure. Record-level access still belongs in `src/lib/auth.ts`, `src/lib/admin/permissions.ts`, and `src/lib/authorization.ts`.

## Middleware-Protected Workspaces

The protected prefixes live in `src/lib/security/protected-routes.ts` and are consumed by `src/middleware.ts`. The middleware `config.matcher` remains an explicit literal because Next.js needs matcher values to be statically analyzable at build time. `middleware-static:verify` compares that literal with the shared manifest.

| Prefix | Purpose | Server-side authority |
| --- | --- | --- |
| `/admin` | Admin and super-user operations | `src/app/admin/layout.tsx`, `requireRole(["ADMIN"])`, super-user helpers for sensitive tools |
| `/landlord` | Landlord/property manager workspace | `src/app/landlord/layout.tsx`, `requireRole(["LANDLORD"])`, record ownership helpers |
| `/applicant` | Applicant/renter workflow | `src/app/applicant/layout.tsx`, `requireRole(["APPLICANT", "TENANT"])` |
| `/tenant` | Resident portal | `src/app/tenant/layout.tsx`, `requireRole(["TENANT"])` |
| `/vendor` | Vendor/maintenance portal | `src/app/vendor/layout.tsx`, `requireUser`, `assertVendorPortalAccess` |
| `/inspector` | Inspection workflow | `src/app/inspector/layout.tsx`, `requireRole(["INSPECTOR"])` |
| `/account` | Password/account settings | `requireUser` in page/action handlers |
| `/dashboard` | Role-aware dashboard entry | `src/app/dashboard/page.tsx`, `requireUser`, role dashboard builder |
| `/documents` | Private document redirect surface | `src/app/documents/page.tsx`, `getVerifiedCurrentUser`, then role redirect |

## Role Boundary Notes

- Applicant routes now require applicant or tenant role instead of any signed-in user. This keeps landlords/vendors from entering resident application surfaces through direct URLs.
- Tenant routes remain tenant-only, preserving the dedicated tenant portal mental model.
- Vendor routes use a vendor-specific access assertion because vendor portal eligibility can come from invitation or approved access, not only `UserRole.VENDOR`.
- Admin routes are admin-authenticated by layout, while super-user-only actions such as sample data export remain guarded by `requireSuperUser`.

## Release Gate

`protected-routes:verify` and `middleware-static:verify` check that:

- Middleware consumes the shared protected route prefix manifest instead of a stale local prefix array.
- Middleware keeps a build-safe static matcher literal that matches the manifest.
- Tenant, vendor, inspector, dashboard, and documents are included in the middleware matcher.
- Role layouts contain the expected server-side guard markers.
- Applicant routing is role-scoped rather than any-user scoped.
- Release metadata and build gates include the protected-route verifier.

## Follow-Up Work

- Add browser-level unauthenticated redirect tests once the CI environment has a running Next server.
- Add explicit `/notifications` shared-route protection if a top-level notifications page is introduced.
- Consider route-level metadata for public/private classification if the route tree grows substantially.

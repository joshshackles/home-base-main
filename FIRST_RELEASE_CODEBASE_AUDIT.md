# First Release Codebase Audit

Version: 4.46.0

## Executive Summary

HomeBase MLS has matured into a broad housing marketplace and operations platform, but the codebase still carries visible release-history patterns from rapid iteration: many historical verifier scripts, many release-specific docs, overlapping admin surfaces, legacy dashboard language, and multiple route families that are useful internally but need a clearer public first-release architecture. The first live release should keep the current real product pathways, centralize navigation and permissions, remove unused experimental components, and avoid shipping generated files or fake production states.

This pass made safe code changes where the evidence was clear: centralized role navigation, removed an unused legacy dashboard component, simplified the release verification gate, strengthened unit-photo authorization, added missing record-level permission helpers, and removed generated TypeScript build metadata.

## What Was Reviewed

- `package.json`, package scripts, lockfile version metadata, and package cleanliness rules.
- `prisma/schema.prisma`, enums, and high-level model families for users, account access, rentals, applications, documents, payments, maintenance, inspections, messaging, integrations, audit logs, and saved searches.
- `src/app` route structure for public, applicant, tenant, landlord, inspector, vendor, and admin areas.
- Dashboard architecture in `src/components/dashboard`, `src/lib/dashboard`, and role layouts.
- Shared layout/navigation in `src/components/layout/DashboardShell.tsx`.
- Auth and authorization in `src/lib/auth.ts`, `src/lib/authorization.ts`, and `src/lib/admin/permissions.ts`.
- Marketplace, tenant directory, unified inbox, admin command center, maintenance, and role dashboard code paths.
- Release documentation and verifier scripts.
- Generated/cache files included in the package tree.

## First-Release Product Pathways

Public user:
- Homepage
- Marketplace search
- Listing details
- Register/sign in

Applicant/renter:
- Dashboard
- Reusable renter profile
- Saved homes/searches
- Applications
- Inbox/messages
- Documents

Tenant:
- Dashboard
- Current lease/rent
- Maintenance
- Inbox/messages
- Documents/notices

Landlord/property manager:
- Dashboard
- Properties
- Units
- Listings
- Applications
- Tenant Directory
- Unified Inbox
- Maintenance
- Inspections/vendors/reports

Inspector:
- Dashboard
- Assigned inspections
- Needs-attention/report workflow

Vendor/maintenance:
- Dashboard
- Assigned jobs
- Invoices
- Contacts

Admin/super user:
- Command Center
- Users/access requests
- Workflows
- Audit logs
- Security
- System health
- Integrations

## What Should Stay

- The role-based dashboard system in `src/lib/dashboard/role-dashboard.ts` and `src/components/dashboard/RoleDashboard.tsx`.
- The shared dashboard shell in `src/components/layout/DashboardShell.tsx`.
- The shared UI primitives in `src/components/ui/system/index.tsx`.
- Server-side auth and session verification in `src/lib/auth.ts`.
- Central record authorization in `src/lib/authorization.ts`.
- Admin/super-user operations in `src/lib/admin/permissions.ts`, `src/lib/admin/command-center.ts`, and `src/components/admin/AdminCommandCenter.tsx`.
- Marketplace Search v2 and map-preview mode, because they are real user-facing flows.
- Unified landlord inbox adapter, because it safely normalizes existing communication sources without a destructive migration.
- Tenant portal routes, because they fix the applicant/tenant mental model for release.

## What Was Removed

- Removed `src/components/dashboard/WorkhorseDashboard.tsx`. It was no longer imported from `src` and competed conceptually with the active role-based dashboard system.
- Removed generated `tsconfig.tsbuildinfo` from the package tree. It is not source and the existing package cleanliness script already forbids `.tsbuildinfo` files.

## What Was Consolidated

- Centralized role navigation into `src/lib/navigation/first-release.ts`.
- Updated applicant, tenant, landlord, inspector, vendor, and admin layouts to consume the centralized navigation config instead of each carrying separate inline nav definitions.
- Updated `DashboardShell` so each role can provide a concrete quick action label instead of the generic `Quick create`.
- Replaced the historical all-up release verifier chain in `package.json` with a focused first-release gate: `first-release:verify`, route checks, package cleanliness, typecheck, and tests.

## What Should Be Removed Later

- Historical release verifier scripts under `scripts/verify-*` that are not part of the first-release gate. They are useful as reference, but they are no longer the primary release contract.
- Historical release docs under `docs/` and root `docs-update*.md` files after the team decides which documentation should remain public/operational.
- Duplicate admin pages that now overlap with Command Center sections, once the command-center replacement is manually verified with production data.
- Legacy applicant-resident pages that now have tenant equivalents, after redirect behavior is fully verified for signed-in tenants.

## What Should Be Consolidated Next

- Admin page headers should gradually move from `AdminPageHeader` to the shared `ProductPageHeader` where appropriate.
- Landlord page headers should gradually move from `LandlordPageHeader` to shared product headers.
- Status pill implementations should continue migrating to `WorkflowStatusBadge`.
- Report route implementations should share a single report config/query pattern.
- Admin and landlord rental/unit pages should share more property/unit DTO helpers.

## What Should Be Rewritten

- The release verification setup should eventually become a small suite of behavior-oriented tests rather than dozens of marker-based scripts.
- Admin operations pages should become command-center drilldowns rather than independent admin mini-apps.
- Messaging should eventually migrate from adapter-normalized sources into a single canonical thread/message model, after data migration planning.
- Sample/demo data should be fully tagged at creation time before any destructive cleanup controls are enabled.

## Live-Release Risks

- `npm`, `npx`, and local dependencies were unavailable in this execution environment, so full TypeScript, lint, test, and build runs require a developer machine or CI environment with Node/npm installed.
- The Prisma schema is broad and supports many modules. Destructive schema cleanup should wait until production seed/demo strategy and data retention expectations are confirmed.
- Some admin pages overlap with Command Center concepts. This is not immediately dangerous, but it can confuse operators if all links remain equally prominent.
- Property-manager scoping still needs real-world validation against actual portfolio/team relationship records.
- Several legacy verifier scripts still reference removed or older release markers; they are intentionally no longer part of `npm run verify`.

## Permission and Security Review

What is strong:
- `requireUser`, `requireRole`, `requireAdmin`, and `requireSuperUser` enforce server-side access.
- `src/lib/authorization.ts` centralizes access checks for properties, units, applications, maintenance requests, message threads, documents, lease packets, inspections, and ledger entries.
- Admin sample/security operations are super-user gated.

What changed:
- Added `canAccessListing` and `assertCanAccessListing` as first-release aliases around unit/listing access.
- Added `canAccessLead` and `assertCanAccessLead`.
- Updated nonpublic unit photo access to use `canAccessUnit`.
- Added `canManageAdminOperations` for clearer super-user-only operation checks.

Still needs manual review:
- Every API route and server action should be mapped to one central authorization helper before launch.
- Property-manager access should be tested with real shared-property scenarios.
- Tenant/applicant profile-sharing rules should be manually verified against tenant directory and application detail views.

## Recommended Final Architecture

- `src/lib/navigation/first-release.ts` owns role navigation and first-release pathways.
- `src/components/layout/DashboardShell.tsx` remains the single dashboard shell.
- `src/components/dashboard/RoleDashboard.tsx` remains the only dashboard renderer.
- `src/lib/dashboard/*` remains the role dashboard data/config layer.
- `src/components/ui/system/index.tsx` owns shared page headers, empty states, status badges, tables, and product UI primitives.
- `src/lib/authorization.ts` owns record access decisions.
- `src/lib/admin/permissions.ts` owns admin/super-user decisions.
- Public marketplace logic stays in `src/app/marketplace` and `src/lib/marketplace`.
- Admin Command Center becomes the operational hub, with old admin pages treated as drilldowns.

## Production Readiness Checklist

- Run `npm install` in an environment with npm.
- Run `npm run first-release:verify`.
- Run `npm run routes:check`.
- Run `npm run package:cleanliness`.
- Run `npm run typecheck`.
- Run `npm run test`.
- Run `npm run build`.
- Manually verify public homepage, marketplace, listing detail, applicant profile/apply, tenant portal, landlord dashboard/inbox/applications/tenants/maintenance, vendor dashboard, inspector dashboard, and admin command center.
- Confirm production environment variables and no local `.env` files are packaged.
- Confirm sample data controls are super-user only and not destructive without safe tagging.

# Permission Matrix & Guessed-ID Security Tests

HomeBase MLS protects record detail routes and file-like APIs with server-side authorization, not navigation hiding. This matrix is the first-release security gate for preventing guessed IDs from exposing tenant, applicant, landlord, admin, document, photo, lease, maintenance, inspection, message, or ledger data.

## Security Policy

- Deny by default when a record cannot be proven visible to the signed-in user.
- Return not-found style responses for private assets where revealing existence would leak data.
- Keep tenant/applicant packet details behind either a direct application relationship, active occupancy, landlord-owned unit relationship, or profile sharing connection.
- Keep super-user-only operations, especially sample/demo data controls, behind `requireSuperUser`.
- Prefer central helpers in `src/lib/authorization.ts`; where pages use inline Prisma scoping, the query must include the signed-in user relationship in the `where` clause.

## Central Authorization Helpers

| Record | Helper | Primary allowed access |
| --- | --- | --- |
| Property | `canAccessProperty` / `assertCanAccessProperty` | Admins, owning landlord/property manager, active profile connection where applicable |
| Unit/listing | `canAccessUnit`, `canAccessListing` | Admins, owner-scoped landlord/property manager, applicant/tenant relationship, active occupancy, active profile connection |
| Lead | `canAccessLead` | Admins, lead email owner, linked application participant, owner-scoped landlord/property manager |
| Application | `canAccessApplication` | Admins, applicant/tenant by user or email, owner-scoped landlord/property manager, active profile connection |
| Maintenance request | `canAccessMaintenanceRequest` | Admins, requester, assignee, linked application participant, owner-scoped landlord/property manager |
| Message thread | `canAccessMessageThread` / `canCreateMessageThread` | Admins, creator, linked application participant, linked maintenance participant |
| Document | `getAuthorizedDocument` / `visibleDocumentWhereForUser` | Uploader, scoped application/unit/property/lease visibility, applicant/landlord document visibility rules |
| Lease packet | `canAccessLeasePacket` | Admins, assigned signer, linked application participant |
| Inspection | `canAccessInspection` | Admins, assigned inspector, linked application participant, owner-scoped landlord/property manager |
| Ledger entry | `canAccessLedgerEntry` | Admins, tenant, active occupancy, linked application participant, owner-scoped landlord/property manager |

## High-Risk Routes Covered By Static Release Gate

| Route/action | Risk | Required protection marker |
| --- | --- | --- |
| `src/app/api/documents/[id]/route.ts` | Guessed document download | `getAuthorizedDocument`, denied audit logging, generic unavailable response |
| `src/app/api/unit-photos/[id]/route.ts` | Nonpublic unit photo discovery | `canAccessUnit`, generic `Photo not found.` response |
| `src/app/admin/system/sample-data/route.ts` | Demo/sample payload exposure | `requireSuperUser` |
| `src/app/workflow-actions.ts` | Cross-record workflow mutation | `assertCanAccessApplication`, `assertCanAccessMaintenanceRequest`, `assertCanAccessMessageThread`, `assertCanCreateMessageThread`, `assertCanAccessUnit` |
| `src/app/landlord/applications/[id]/page.tsx` | Applicant packet guessed ID | `ownerId: user.userId` scoped application query |
| `src/app/landlord/units/[id]/page.tsx` | Unit guessed ID | `ownerId: user.userId` scoped unit query |
| `src/app/landlord/tenants/[id]/page.tsx` | Tenant/applicant CRM guessed ID | owner-scoped source records plus authorized/locked packet display |
| `src/app/applicant/applications/[id]/page.tsx` | Applicant application guessed ID | `applicantUserId` or `applicantEmail` scoping |
| `src/app/applicant/leases/[id]/page.tsx` | Lease packet guessed ID | linked application applicant scoping and signer matching |
| `src/app/api/cron/send-queued-email/route.ts` | Public cron execution | `CRON_SECRET` or `VERCEL_CRON_SECRET` authorization |
| `src/app/api/cron/process-payments/route.ts` | Public payment job execution | `CRON_SECRET` or `VERCEL_CRON_SECRET` authorization |
| `src/app/api/webhooks/email/route.ts` | Spoofed provider event | shared-secret verification |
| `src/app/api/webhooks/quickbooks/route.ts` | Spoofed accounting event | QuickBooks signature/shared-secret verification |

## Guessed-ID Test Strategy

The new `permission-matrix:verify` script is intentionally static and fast enough for the release gate. It checks that high-risk routes still reference the expected server-side guards and ownership markers. Runtime database-backed tests should be added next with seeded users:

1. Landlord A cannot open Landlord B property, unit, application, tenant detail, inbox thread, maintenance request, document, or ledger IDs.
2. Applicant A cannot open Applicant B application, lease packet, document, message, or maintenance IDs.
3. Vendor/maintenance users cannot open unassigned work orders or unrelated message threads.
4. Inspectors cannot open unassigned inspections unless linked by admin/super-user access.
5. Normal admin users cannot access super-user sample/demo payload exports.
6. Guests receive 401/404 style responses for private document and photo guesses.

## Runtime Coverage Added In v4.48.0

`tests/unit/authorization.test.ts` now exercises the central authorization helpers directly with mocked Prisma responses. The tests cover cross-landlord application guesses, cross-applicant application guesses, private unit access, maintenance participant scoping, message thread inheritance through linked records, lease signer visibility, hidden document guesses, denied-access audit logging, approved property-manager grants, and active profile connections.

These tests are intentionally below the HTTP layer so they stay fast, deterministic, and independent from a seeded database. End-to-end route tests should still be added for the exact HTTP status and not-found behavior of pages and API routes.

## Follow-Up Work

- Add fixture-driven Vitest or Playwright API tests for the guessed-ID scenarios above.
- Consolidate landlord inline `ownerId: user.userId` route scoping into central helper calls where detail pages need shared behavior.
- Add property-manager delegated portfolio tests once delegated property management records are modeled explicitly.
- Expand audit events from denied downloads to denied page/server-action access where the UX allows it without creating noisy logs.

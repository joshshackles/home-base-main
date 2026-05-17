
## 3.0.9 - Unit Media and Listing Detail Upgrade

- Added durable `UnitPhoto` records, a migration, and a public/owner-safe photo delivery route for rental listing images.
- Added landlord upload, delete, and featured-photo controls with a 12-photo cap per unit.
- Expanded unit details with school district, neighborhood, nearby features, home and roof age, average utilities, parking, laundry, appliances, flooring, yard, smoking, lease terms, move-in fees, rent due day, late fees, and previous tenant notes.
- Upgraded landlord unit listing cards so each unit is easy to click into as a workspace.
- Added richer landlord unit panels for photos, rent/deposit terms, listing/location details, and tenant history.
- Updated marketplace cards and detail pages to show real listing photos and richer location facts.
- Added unit photo data portability and a focused verification gate.

## 3.0.8 - Admin Data Portability

- Added admin JSON export for users, access requests, properties, units, leads, applications, profiles, documents, inspections, maintenance, messages, leases, ledger records, audit logs, and security events.
- Added admin JSON import that creates or updates records by stable IDs without deleting records missing from the import file.
- Added a downloadable sample import file with 6 users for each current user role and 10 home listings assigned to sample landlords.
- Added data portability verification coverage and included it in the main verification chain.

## 3.0.7 - Small Portfolio Property and Unit Workflow

- Added an `Add Home` fast path for landlords whose address is the rentable home, creating the property shell and listing unit in one step.
- Kept the existing multi-unit property workflow for apartment complexes, duplexes, and buildings with multiple rentable units.
- Updated landlord dashboard, property, unit, and empty-state copy to clearly distinguish single-family homes from multi-unit properties.
- Added property/unit workflow verification coverage and included it in the main verification chain.

## 3.0.6 - Account and Landlord Activation Flow

- Added optional landlord access intent to applicant signup so future landlords can create an account and request the landlord module in one pass.
- Improved the dashboard access request panel with a clear landlord approval path and surfaced request reasons in the admin review queue.
- Added landlord self-service property creation after approval, removing the dead end where a new landlord needed an admin-created property before adding units.
- Updated the landlord empty states and dashboard queue to guide new landlords from property creation to unit publishing.
- Added account-flow verification coverage and included it in the main verification chain.

## 3.0.5 - Password retry and account flow hardening

- Fixed reset-password validation redirects so the token is preserved after a failed first attempt.
- Added retry cache-busting params so password forms remount cleanly after errors.
- Preserved required-password-change context after current-password mistakes.
- Added explicit submit button types on password forms to avoid stale submit behavior.

# 3.0.3 - Demo login button reliability fix

- Made demo login buttons self-healing: clicking a demo account now upserts the matching seeded user, activates it, resets lockout state, clears forced password reset, and applies the shared demo password before creating the session.
- Added the Inspector demo account button so every seeded role has a one-click login path.
- Kept manual login behavior unchanged for non-demo credentials.

## v3.0.2 - Demo Login and Signup Redirect Fix

- Fixed applicant signup so successful `redirect()` calls are no longer caught and displayed as raw `NEXT_REDIRECT` errors.
- Replaced randomized seed passwords with a consistent demo default of `DemoPassword123!`, still overridable through seed environment variables.
- Added one-click demo login buttons for Admin, Landlord, and Applicant accounts.
- Added a seeded inspector account and aligned the sample inspection assignment to that account.
- Bumped package and README version from `3.0.1` to `3.0.2`.


## v3.0.1 - Enum Type Narrowing Build Fix

- Fixed enum-safe role checks in authorization helpers so Vercel/Next TypeScript builds do not fail on narrowed array literal `.includes()` calls.
- Bumped package and README version from `3.0.0` to `3.0.1`.


## v3.0.0 - Tenant Transition and Interface Fluidity Foundation

- Elevated the shared workhorse dashboard with primary action tiles, urgent-first task ordering, and structured access status badges.
- Added applicant profile draft persistence so household or income subform submissions do not wipe unsaved parent profile text.
- Added applicant self-service application withdrawal with audit logging and application history notes.
- Added a consolidated applicant financial calendar for payroll, planned tenant payments, and open ledger due dates.
- Replaced ledger dropdown identifiers with human-readable property/unit and description labels.
- Hardened applicant lease preview wrapping to avoid mobile layout overflow.
- Added `npm run test:form-persistence`, `npm run test:sort-priority`, `npm run test:label-masking`, and `npm run tenant-transition:verify` to the main verification chain.

## v1.8.4 - Lease and E-signature Hardening

- Added a centralized signature workflow helper for tenant and landlord lease signing.
- Made signature completion idempotent by updating only pending signature requests and rejecting stale duplicate submissions.
- Added typed-signature normalization and placeholder-signature rejection.
- Added stronger readiness checks so completed, voided, expired, or already-evidenced requests cannot be signed.
- Added expiration handling with security-event logging when a pending signature is attempted after expiration.
- Added signature-completion security-event logging with lease text hash and signature evidence hash metadata.
- Prevented resending a lease packet for signature after any signer has already completed a signature; admins must reissue instead.
- Reset all electronic-signature evidence fields when a not-yet-signed request is legitimately refreshed.
- Made final signed lease PDF generation idempotent so duplicate completion attempts reuse the existing final document when possible.
- Added `npm run esignature:update4:verify` and included it in the main verification chain.

# v1.8.2 - Messaging Security and Inbox Correctness

## v1.8.3 - Document Access and Visibility Enforcement

- Added centralized document visibility filters for applicant, landlord, and staff-facing document workflows.
- Updated authorized document downloads so document visibility is applied in the database query instead of after an unrestricted lookup.
- Updated applicant application and lease pages to use centralized document and document-request visibility helpers.
- Updated landlord lease document lists to use centralized document visibility helpers.
- Added stricter admin upload validation to reject mismatched application, unit, property, and lease-packet attachments.
- Added document-access verification coverage to prevent regressions in document visibility and download authorization.


- Made the shared text-message inbox thread-selectable with a `?thread=` route state instead of always rendering the first conversation.
- Redirected message sends back to the correct role inbox with the active thread selected.
- Added centralized message and thread visibility helpers so non-staff views do not receive internal notes or internal-only threads.
- Changed internal-note behavior so unauthorized forged submissions are rejected instead of silently converted into public messages.
- Removed hard-coded landlord internal-note access; the UI now shows internal-note controls only when the authorization layer allows them.
- Kept admin inboxes able to see internal notes while applicant and standard landlord inboxes receive only public conversation content.
- Added `scripts/verify-messaging-update2.ts` and included it in the main verification chain.

# v1.8.1 - Authorization Foundation

- Added `src/lib/authorization.ts` as the central permission layer for properties, units, applications, maintenance requests, message threads, documents, lease packets, inspections, and ledger entries.
- Added reusable `assertCanAccess...` helpers so future server actions can reject unauthorized submitted IDs before reading, writing, signing, messaging, or downloading records.
- Hardened workflow messaging so replies check thread-level access and new threads check linked application/maintenance access before creating records.
- Restricted internal message notes to staff-authorized users and filtered internal notes out of the applicant inbox at query time.
- Replaced duplicated document-download authorization with the centralized document visibility/ownership helper.
- Added an authorization verification script and included it in the main verification chain.

# v1.8.0 - Dashboard Modules and Text Messaging

- Kept the applicant dashboard available to every signed-in user as the base dashboard.
- Treated admin users as superusers for module access while preserving module-specific dashboards.
- Allowed approved landlord/property-manager access requests to open landlord module routes without removing the applicant dashboard.
- Added applicant-dashboard module launch cards for approved landlord/admin access.
- Rebuilt applicant, landlord, and admin inboxes with a shared text-message style conversation UI.

# v1.7.9 - Workhorse Dashboard Foundation

- Rebuilt applicant, landlord, and admin landing pages on one shared main dashboard component with consistent metrics, work queue, module launcher, and access state.
- Added account access request records so users can start as applicants and request landlord, property manager, caseworker, inspector, maintenance, vendor, or admin access.
- Added a dashboard access request form and admin-facing approve/decline controls for pending access requests.
- Updated the global header to expose a single Dashboard entry while preserving role-specific admin/landlord/applicant areas.

# v1.7.8 - Admin Route String Hotfix

- Fixed malformed admin maintenance and admin inbox route strings that caused Vercel webpack syntax errors.

# v1.7.7 - Available Rentals Upgrade

- Rebuilt the available rentals page into a full discovery experience with a stronger search header, inventory stats, sticky filters, sort controls, city shortcuts, and featured rental highlight.
- Added expanded marketplace filters for keyword search, min/max rent, minimum square footage, utilities, pets, accessibility, voucher support, bedrooms, bathrooms, and sort modes.
- Added applicant-aware rental match scores using renter profile preferences.
- Upgraded rental cards with save/remove favorite actions, stronger listing hierarchy, feature chips, match labels, and direct inquiry links.
- Connected listing details to the inquiry area with a stable anchor.

# v1.7.6 - Applicant Renter Tools

- Expanded applicant renter profiles with rental goals, voucher, pets, accessibility, employment, references, and renter bio fields.
- Added saved rental favorites with private notes and a logged-in landlord inquiry workflow.
- Added applicant home tools for utility tracking, payroll reminders, and tenant payment planning/confirmation records.
- Added marketplace save-to-favorites support for logged-in applicants and tenants.
- Added Prisma migration for favorites, utilities, payroll reminders, tenant payments, and profile fields.
- Fixed the malformed applicant inbox route string.

# v1.7.5 - Landlord Unit Workflow

- Added landlord unit creation from the landlord portal.
- Units marked `AVAILABLE` continue to publish automatically to the public marketplace.
- Added landlord-managed current tenant/application links on units.
- Added a landlord unit hub with tenant info, lease links, payment history, ledger activity, payment plans, repair submission, contacts, client notes, and messaging.
- Added Prisma migration fields for unit tenant links, important contacts, and client notes.
- Fixed malformed landlord maintenance and inbox route strings.

# v1.7.4 — Workflow Update 4

## Lease Automation + Workflow Cleanup

- Added an admin lease timeline showing draft, approval, signature, completion, and final signed PDF progress.
- Added a manual Refresh Automation action that re-checks completed signatures and generates the final signed PDF when ready.
- Improved automatic lease completion so final signed PDF generation is idempotent and tied to all required signatures.
- Added expired signature renewal controls with a fresh expiration window and queued initial notification.
- Added landlord electronic-signature consent capture, lease text hashing, signature evidence hashing, and final PDF hash propagation to match the tenant flow.
- Added applicant and landlord lease progress cards so users can see signature progress and final lease readiness.
- Updated package and README version consistency to v1.7.4.
- Added verification coverage for workflow update 4.


# v1.7.3

## Maintenance + Inbox Workflow Update

- Added applicant maintenance request workflow
- Added admin and landlord maintenance queues
- Added workflow message inboxes for applicants, admins, and landlords
- Added message threads connected to maintenance and application records
- Added staff-only internal message notes
- Added maintenance assignment, priority, and status tracking
- Added verification coverage for workflow update 3

## v1.7.2 — Workflow Update 2

- Improved admin password recovery so reset links are emailed through the configured provider instead of being shown as the primary production path.
- Added reset email success/failure feedback to the admin user edit screen.
- Added Hobby-mode email processing messaging so admins understand that Vercel Hobby cron processes queued email daily unless they manually process the queue.
- Added notification center queue controls for immediate processing and requeuing failed signature emails.
- Added full queue counts for sent, queued, failed, and delayed-retry notifications instead of relying only on the latest history rows.
- Added Workflow Update 2 verification coverage.

## v1.7.0 — Vercel Hobby compatibility follow-up

## v1.7.1 — Workflow Update 1

- Added database-backed revokable sessions for new sign-ins while preserving legacy cookie-session compatibility during rollout.
- Added applicant self-signup with automatic matching to existing applications by email address.
- Added secure application claim links so admins can connect marketplace/application records to applicant portal accounts.
- Added claim-link landing pages that create or connect applicant accounts and route users directly to their application.
- Added Prisma migration for `UserSession` and `ApplicationClaimToken`.
- Kept the update Vercel Hobby-compatible; claim links do not rely on high-frequency cron.


- Fixed the Vercel preflight checker so it parses `vercel.json` instead of relying on whitespace-sensitive string matches.
- Confirmed `framework: nextjs` and `buildCommand: npm run vercel-build` are required in `vercel.json`.
- Kept Hobby-safe daily cron scheduling for queued email processing.
- Changed missing `CRON_SECRET` from a hard build failure to a deployment warning unless `VERCEL_STRICT_ENV=1` or `REQUIRE_CRON_SECRET=true` is set.
- Documented that scheduled cron requests will be rejected until `CRON_SECRET` is configured in Vercel.

## v1.7.0 — Vercel Hobby compatibility

- Adjusted Vercel cron configuration to comply with Hobby plan limits by running the queued-email processor once daily.
- Prevented deployment failures caused by unsupported cron frequencies on Hobby.
- Updated Vercel deployment documentation to explain Hobby daily-processing mode and the future Pro upgrade path.
- Added Vercel preflight validation to catch accidental non-Hobby cron schedules before deployment.

## v2.6.12 Update 12 — Production polish and compliance readiness

- Centralized app version display through `src/lib/app-version.ts`.
- Replaced hardcoded version strings in admin/system UI.
- Added Privacy, Terms, Fair Housing, and Accessibility starter pages.
- Added footer legal/compliance navigation.
- Added skip-to-content accessibility link.
- Added root Open Graph metadata, robots, and sitemap routes.
- Expanded upload support to HEIC/HEIF, CSV, and XLSX.
- Rewrote README to remove old version contradictions.
- Added Update 12 verification script and npm command.

## v2.6.12-update7

- Replaced the hand-built PDF string writer with pdf-lib for generated lease PDFs.
- Added font-width-based text wrapping, safe long-word splitting, PDF metadata, and deterministic output.
- Updated lease packet and final signed lease generation to await the PDF renderer.
- Added `npm run pdf:verify` and included it in verification/smoke scripts.
- Documented the remaining Unicode-font limitation and future embedded-font path.


## v2.6.12-update6

- Added S3-compatible object storage provider for uploaded and generated documents.
- Added Cloudflare R2/AWS S3/MinIO environment configuration.
- Added object-storage write/read/delete smoke verification.
- Added migration helper to move existing local/database documents to object storage.
- Updated environment validation and system status messaging for production object storage.


## v2.6.12 Update 5 — Security Headers

- Added a centralized browser security header policy in `next.config.mjs`.
- Added CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, permissions policy, and cross-origin isolation headers.
- Disabled the `X-Powered-By` header and kept compression enabled.
- Expanded `npm run security:verify` coverage for the new header policy.

# Changelog

## 2.6.9 - Vercel Audit Metadata Build Fix

- Fixed Vercel TypeScript build errors in audit and security-event metadata writes by using Prisma JSON input typing.
- Keeps prior Vercel fixes for Next config, Prisma generation, schema relations, enum typing, server-action form typing, document route narrowing, and AppHeader typing.


## v2.6.7 - Vercel document route type fix

- Fixed strict TypeScript narrowing in the protected document download API route.
- Keeps the v2.6.x Vercel configuration, Prisma generate, schema relation, seed check, account action, server-action form, and enum typing fixes.

## v2.6.6 - Vercel TypeScript locked status fix

- Fixed strict TypeScript build errors caused by narrowed enum arrays in admin lease/payment-plan actions.
- Kept prior Vercel, Prisma, and server-action build fixes.


## v2.6.6 - Vercel React Server Action Type Fix

- Added a React type augmentation for server action form submissions so Vercel/TypeScript accepts `<form action={serverAction}>` in App Router server components.
- Kept the prior Vercel fixes for Prisma generation, `next.config.mjs`, the inspection relation, seed verification typing, and account action redirects.



## v2.6.4 - Vercel Account Action TypeScript Fix

- Fixed a strict TypeScript narrowing issue in `src/app/account/actions.ts` by marking the password error redirect helper as `never` returning.
- Keeps the Vercel config, Prisma generate, Prisma relation, and seed verification fixes from the prior Vercel patches.


## 2.6.3 - Vercel TypeScript Verify-Seed Fix

- Fixed a TypeScript inference issue in `scripts/verify-seed.ts` that caused Vercel builds to fail while checking valid lease packet statuses.
- Preserved the previous Vercel-compatible Next.js config and Prisma relation fixes.

## v2.6.0

- Added storage verification script for protected document storage.
- Added database-backed seed verification for core sample records across users, inventory, applications, documents, leases, signatures, inspections, ledger, recurring schedules, and payment plans.
- Added workflow verification for landlord scoping, applicant scoping, application relationships, ledger balances, recurring-charge duplicate keys, and signature/notification counts.
- Added static security verification for role checks, CSV safety, storage safety, upload-size alignment, recurring-charge safeguards, and financial voiding behavior.
- Added `npm run qa:smoke` and expanded `npm run verify`.
- Added QA and workflow verification documentation.
- Updated preflight checks, system page, README, and package version.

## v2.5.0

- Added reusable pagination utilities and admin pagination UI.
- Added reusable search/filter controls for admin list screens.
- Added search, status filters, and pagination to Leads, Applications, Documents, Audit Log, Inspections, Leases, and Ledger activity.
- Reduced unbounded high-volume `findMany()` list queries on major admin screens.
- Kept existing forms, detail screens, and workflows intact while improving list usability.
- Updated README and package version.

## v2.4.0

- Added quality and safety hardening without introducing major new user-facing modules.
- Raised the server action body-size limit to 12mb so the 10mb document upload limit is not blocked by Next.js first.
- Hardened protected session checks so `requireUser` and `requireRole` verify the database user is still active and still has the expected role.
- Added CSV formula-injection protection for exported spreadsheet values.
- Added recurring-charge source metadata and a database-level uniqueness constraint to prevent duplicate generated monthly charges.
- Updated recurring charge generation to use stable period keys and tolerate duplicate-generation race conditions safely.
- Tightened payment-plan installment changes so changing a paid installment back to due/missed/waived voids the linked ledger payment.
- Expanded route inventory coverage for key nested/edit/detail routes.
- Strengthened preflight checks for upload configuration and recurring-charge safeguards.
- Updated README, changelog, migrations, and package version.

## v2.3.0

- Added ledger reporting and export workflow.
- Added full ledger CSV export at `/admin/ledger/export`.
- Added balance aging CSV export at `/admin/ledger/aging/export`.
- Added reports hub at `/admin/ledger/reports`.
- Added printable applicant/tenant statements at `/admin/ledger/statements`.
- Added per-application statement pages and CSV exports.
- Added applicant-facing printable statement and CSV export.
- Added CSV helper utilities and shared ledger report grouping helpers.
- Updated ledger, aging, applicant ledger, route checks, README, and package version.

## v2.2.0

- Added payment plan and balance aging workflow.
- Added PaymentPlan and PaymentPlanInstallment Prisma models.
- Added statuses for active/completed/defaulted/cancelled plans and due/paid/missed/waived installments.
- Added admin payment plan center, new plan page, and plan detail page.
- Added balance aging report at `/admin/ledger/aging`.
- Added automatic ledger payment entry creation when installments are marked paid.
- Added applicant and landlord payment plan visibility on their ledger pages.
- Added seeded sample payment plan and installments.
- Added v2.2.0 Prisma migration and updated route checks/package version.

## v2.1.0

- Added recurring monthly charge schedules for rent and recurring fees.
- Added admin schedule center at `/admin/ledger/schedules`.
- Added schedule creation at `/admin/ledger/schedules/new`.
- Added schedule detail pages with tenant/subsidy split display and aging context.
- Added bulk generation for due recurring charges through a selected run-through date.
- Added duplicate protection so an already-generated monthly charge is not created again for the same schedule/date.
- Added pause and resume controls for recurring charge schedules.
- Added tenant/subsidy split fields to recurring schedule records.
- Added balance aging labels to ledger balance views.
- Added v2.1.0 Prisma migration and seeded recurring schedule sample data.
- Updated route checks and package version.

# Changelog

## v2.5.0

- Added reusable pagination utilities and admin pagination UI.
- Added reusable search/filter controls for admin list screens.
- Added search, status filters, and pagination to Leads, Applications, Documents, Audit Log, Inspections, Leases, and Ledger activity.
- Reduced unbounded high-volume `findMany()` list queries on major admin screens.
- Kept existing forms, detail screens, and workflows intact while improving list usability.
- Updated README and package version.

## v2.0.0

- Added rent and payment ledger foundation.
- Added LedgerEntry model with charge, payment, credit, and adjustment entry types.
- Added posted, pending, and voided ledger statuses.
- Added payment method tracking.
- Added admin ledger center, ledger creation page, and ledger detail/void workflow.
- Added open balance summaries and application balance snapshots.
- Added landlord ledger visibility scoped to owned units.
- Added applicant ledger visibility scoped to the signed-in applicant or tenant.
- Added sample seeded charge and payment entries.
- Added v2.0.0 Prisma migration and updated route checks.
- Updated dashboard, homepage, system page, security checklist, README, and package version.

## v1.9.0

Inspection workflow release.

- Added admin inspection scheduling at `/admin/inspections/new`.
- Added admin inspection list and detail pages.
- Added inspection status tracking for scheduled, in progress, passed, failed, needs reinspection, and cancelled outcomes.
- Added inspection checklist items with pending/pass/fail/not-applicable statuses.
- Added landlord inspection visibility scoped to owned units.
- Added applicant inspection visibility scoped to the applicant's applications.
- Added inspection audit logs and security events.
- Added v1.9.0 Prisma migration and updated package version.

## v1.8.0

Email delivery integration release.

- Added an email delivery provider abstraction with `console`, `resend`, `webhook`, and `disabled` modes.
- Added `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_SEND_ON_QUEUE`, `RESEND_API_KEY`, and `EMAIL_WEBHOOK_URL` environment settings.
- Added provider, provider message ID, last attempt, sent, failed, and failure reason tracking to signature notifications.
- Added admin notification center controls to send one notification now or send queued notifications in bulk.
- Added `npm run email:send-queued` for cron/scheduled delivery.
- Password reset requests and admin-created reset links now use the configured email provider.
- Document request creation now sends an applicant email notice through the configured provider.
- Added v1.8.0 Prisma migration and updated package version.

## v1.7.0

- Added signature notification records for initial notices, reminders, expiration warnings, and expired requests.
- Added expiration dates, reminder counts, last reminder timestamps, and last notification timestamps to signature requests.
- Added admin notification center at `/admin/notifications`.
- Added reminder queue actions, expiration extension controls, and overdue request expiration.
- Added email-ready notification bodies that can be connected to an email provider later.
- Added applicant and landlord expiration messaging before signing.
- Added v1.7.0 Prisma migration and updated package version.

## v1.6.0

Signed lease finalization release.

- Added final signed lease PDF generation after all required signatures are completed.
- Added final signed lease completion certificate text with signature names, timestamps, IP address, user-agent, and request IDs.
- Added `lockedAt`, `finalDocumentId`, `finalPdfGeneratedAt`, `reissuedFromId`, and `reissueReason` fields to lease packets.
- Locked lease packet term edits after packets are sent for signature, completed, or voided.
- Added admin action to manually regenerate a final signed PDF for completed packets missing a final document.
- Added void-and-reissue workflow that voids pending signature requests, voids the old packet, and creates a replacement draft.
- Added final signed lease controls to the admin lease packet page.
- Added final signed lease documents as shared documents visible to admins, assigned applicants, and assigned landlords.
- Added security event types for final lease generation and lease reissue.
- Added v1.6.0 Prisma migration and updated package version.

## v1.5.0

E-signature workflow foundation release.

- Added `SignatureRole` and `SignatureStatus` enums.
- Added `SignatureRequest` records connected to lease packets and users.
- Added `SENT_FOR_SIGNATURE` and `COMPLETED` lease packet statuses.
- Added admin action to send lease packets for tenant and landlord signature.
- Added signature tracking to admin lease packet detail pages.
- Added applicant lease signature list and detail pages.
- Added landlord lease signature list and detail pages.
- Added typed signature capture with signed timestamp, IP address, and user-agent metadata.
- Added automatic lease completion when all pending signature requests are signed.
- Added signature-related audit logs, lease notes, route checks, seed data, and a v1.5.0 migration.
- Package version updated to `1.5.0`.

## v1.4.0

Lease PDF generation release.

- Added a lightweight server-side PDF generator.
- Added generated document storage support.
- Added admin action to generate a lease PDF from a lease packet.
- Added Generate PDF button to lease packet detail pages.
- Stored generated lease PDFs as protected `Document` records.
- Linked generated PDFs to lease packets, applications, properties, and units.
- Added lease notes and audit logs for PDF generation.
- Updated dashboard, system, security, homepage, README, and package version.

## v1.3.0

- Added lease template records and admin template management.
- Added lease packet records connected to applications.
- Added application-to-lease creation for approved applications.
- Added admin lease list and lease detail pages.
- Added PDF-ready lease preview rendering with template tokens.
- Added lease packet status tracking, editable lease terms, and internal lease notes.
- Added seeded sample lease template and lease packet.
- Added Prisma migration for the lease builder foundation.

## v1.2.0

Document request and checklist workflow release.

- Added `DocumentRequestStatus` and `DocumentRequest` to the Prisma schema.
- Added a v1.2.0 Prisma migration for document requests.
- Added admin ability to request specific documents from an application detail page.
- Added admin ability to review requested documents as requested, submitted, accepted, rejected, or waived.
- Added applicant-facing requested-document checklist cards.
- Added applicant upload flow for fulfilling a specific requested document.
- Linked fulfilled document requests to uploaded document records.
- Added document request counts to admin application lists and applicant dashboard cards.
- Updated the admin document center with an open request queue.
- Updated seed data with sample Photo ID and Proof of Income requests.
- Package version updated to `1.2.0`.

## v1.1.1

Stabilization, setup, and migration cleanup release.

- Added baseline Prisma migration files for fresh PostgreSQL setup.
- Added migration lock file.
- Added `db:setup`, `db:reset`, `migrations:check`, `routes:check`, and `verify` scripts.
- Strengthened preflight checks for required files, pinned package versions, environment warnings, and local document storage access.
- Added route inventory checking for key public, admin, landlord, applicant, account, and document routes.
- Updated admin system page to reflect v1.1.1 and the new recommended local checks.
- Updated README with setup, reset, production notes, known issues, and the next recommended update.
- Package version updated to `1.1.1`.

## v1.1.0

Production authentication hardening release.

- Added database-backed failed login counters and temporary account lockouts.
- Added security event logging for login success, login failure, account lock, logout, password reset, and password change events.
- Added signed-in account password change page at `/account/password`.
- Added forgot/reset password pages with one-time reset tokens.
- Added admin-generated password reset links from the user edit screen.
- Added required password-change handling after admin-created or admin-reset passwords.
- Added admin security event viewer at `/admin/security/events`.
- Added new user security fields to the Prisma schema.
- Updated middleware to protect `/account` routes.
- Updated dashboard, security checklist, README, and package version.

## v1.0.0

Production-readiness release.

### Added

- New `AuditAction` enum and `AuditLog` model.
- New audit helper at `src/lib/audit.ts`.
- New admin audit log page at `/admin/audit`.
- New system status page at `/admin/system`.
- New environment warning helper at `src/lib/env.ts`.
- New `npm run preflight` script.
- New `npm run typecheck` script.
- Audit events for major admin inventory changes.
- Audit events for user management changes.
- Audit events for lead and application workflow changes.
- Audit events for document upload, review, delete, and download actions.
- Audit events for login and logout actions.

### Changed

- Admin dashboard now links to Audit, System, and Security pages.
- Document storage path validation now checks path boundaries more strictly.
- Security checklist now reflects v1.0.0 hardening work.
- Homepage and README now describe the production-readiness release.
- Package version updated to `1.0.0`.

### Still recommended before public deployment

- Replace local auth scaffold or harden it further.
- Move rate limiting to Redis or another persistent shared store.
- Move document storage to private object storage.
- Run `npm run typecheck`, `npm run build`, and route testing locally.

## v0.9.0

Document upload and file management release.

- Added document upload and file management.
- Added document categories, statuses, and visibility controls.
- Added protected local document storage with `/api/documents/[id]` downloads.
- Added admin document center at `/admin/documents`.
- Added application-level document upload and review tools.
- Added applicant document uploads from application detail pages.
- Added document relationships to applications, properties, units, and users.

## v0.8.0

Applicant portal and real application forms release.

## v0.7.0

Landlord portal and ownership-scoped access release.

## v0.6.0

HomeBase MLS rename and application workflow release.

## v0.5.0

User and role management release.

## v0.4.1

Security and stability hardening release.

## v0.4.0

Authentication scaffold release.

## v0.3.0

Public marketplace release.

## v0.2.0

Inventory management release.

## v0.1.0

Initial app shell.

## v2.6.2 Vercel/Prisma hotfix

- Replaced `next.config.ts` with Vercel-compatible `next.config.mjs`.
- Updated the build script to run `prisma generate` before `next build`.
- Added `postinstall` Prisma generation for Vercel installs.
- Fixed the missing Prisma back-relation from `Unit` to `Inspection`.

## 2.6.8 - Vercel App Header Build Fix

- Fixed Vercel TypeScript build error by making `AppHeader` a synchronous server component.
- Keeps prior Vercel fixes for Next config, Prisma generation, schema relations, enum typing, server-action form typing, and document route narrowing.

## v2.6.12 Update 4 — Password/security policy hardening

- Added a centralized password policy helper with a 14-character minimum and complexity checks.
- Blocked old demo/default passwords such as `admin12345`, `landlord12345`, and `applicant12345`.
- Applied the stronger policy to admin-created users, admin password updates, self-service password changes, and password resets.
- Replaced static seed passwords with generated temporary passwords or optional `SEED_*_PASSWORD` environment variables.
- Marked seeded users for forced password change.
- Updated login, account, reset, README, and `.env.example` copy to remove unsafe demo-password guidance.
- Expanded static security verification to check the new password-hardening controls.

## v2.6.12 Update 8 - E-signature evidence hardening

- Added explicit electronic-signature consent capture to tenant lease signing.
- Stored the exact consent text accepted by the signer.
- Added lease text SHA-256 hashing at signature time.
- Added signature evidence SHA-256 hashing.
- Added final signed PDF SHA-256 hashing.
- Stored final PDF hash on generated lease documents and signed signature requests.
- Added administrator visibility into signature evidence hashes.
- Added `npm run esignature:verify`.


## Update 10 — Email Queue + Production Environment Hardening

- Added durable retry metadata for queued signature notifications.
- Added protected `/api/cron/send-queued-email` endpoint.
- Added exponential retry backoff and max-attempt handling.
- Made production `APP_URL` fail closed when missing or non-HTTPS.
- Added email queue verification script and docs.

## v2.6.12 Update 11 — Automated Tests and Observability

- Added Vitest-based unit test scaffolding.
- Added tests for password policy, environment validation, email configuration, and structured logger behavior.
- Added structured JSON logger with sensitive field redaction.
- Replaced key `console.error` paths in audit/security/rate-limit/email flows with structured logging.
- Added `observability:verify` and included tests/observability in the main `verify` script.

## v2.6.12 Vercel compliance patch

- Added `vercel.json` with Next.js framework config, Vercel build command, region, and queued-email cron schedule.
- Added `npm run vercel-build` so Vercel runs preflight, Prisma generation, migrations, and Next build in order.
- Added `npm run vercel:preflight` and `scripts/verify-vercel.ts` for Vercel-specific environment, storage, cron, Prisma, and security-header checks.
- Added `docs/VERCEL_DEPLOYMENT.md` and updated `.env.example` to prefer S3-compatible storage for production Vercel deployments.

## v1.7.0 follow-up — Vercel TypeScript compatibility

- Fixed the global layout/header compile error caused by rendering an async header component directly in JSX.
- Moved verified user loading to the async root layout and made `AppHeader` a synchronous presentational component.
- Preserved DB-verified session display behavior while keeping the build compatible with Vercel/Next.js TypeScript checks.

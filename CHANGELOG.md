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

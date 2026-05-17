

# HomeBase MLS v2.6.12

## v2.6.12 - Vercel/Neon Environment Alias Support

- Maps common Vercel/Neon database variables (`POSTGRES_PRISMA_URL`, `POSTGRES_URL`, `NEON_DATABASE_URL`) into Prisma's required `DATABASE_URL` at runtime.
- Maps common direct migration variables (`POSTGRES_URL_NON_POOLING`, `POSTGRES_URL_NON_POOLING_DIRECT`, `NEON_DIRECT_URL`) into `DIRECT_URL`.
- Adds a clearer runtime error when no database URL is available.

## v2.6.11 - Vercel Build-Time Database Guard

- Forces the app route tree to render dynamically so Vercel does not attempt build-time Prisma queries while collecting pages.
- Vercel still needs database, auth, storage, app URL, and email provider values in Project Settings.

## v2.6.10 - Vercel/Neon Production Hardening

- Fails closed when `AUTH_SECRET` is missing or unsafe.
- Adds Neon `DIRECT_URL` support and `npm run db:deploy` for production migrations.
- Adds database-backed durable document storage for Vercel/serverless deployments.
- Updates verification scripts for `next.config.mjs`.
- Reduces full-table ledger reads on high-traffic pages.

## v2.6.4 - Vercel Account Action TypeScript Fix

- Fixed a strict TypeScript narrowing issue in `src/app/account/actions.ts` by marking the password error redirect helper as `never` returning.
- Keeps the Vercel config, Prisma generate, Prisma relation, and seed verification fixes from the prior Vercel patches.

# HomeBase MLS v2.6.7

HomeBase MLS is a Next.js, TypeScript, PostgreSQL, and Prisma web application for rental marketplace listings and housing workflow management.

This release is a **testing and workflow verification pass** on top of the existing marketplace, application, document, lease, signature, inspection, and ledger workflows. It adds repeatable checks for setup, route coverage, storage access, seed data, scoped workflows, and key security hardening markers without changing the core feature workflow.

## Core stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- Server actions
- Role-based portals for admin, landlord, and applicant users


## New in v2.6.0

- Added storage verification with a safe write/read/delete smoke test.
- Added seed verification for the sample admin, landlord, applicant, property, unit, lead, application, document requests, lease packet, signatures, inspection, ledger, recurring schedule, and payment plan.
- Added workflow verification for landlord-owned records, applicant-owned records, document requests, leases, inspections, ledger balances, recurring-charge duplicate keys, and signature notifications.
- Added security/static verification for database-backed role checks, CSV formula protection, protected storage helpers, upload-size alignment, recurring-charge uniqueness, and financial voiding behavior.
- Added `npm run qa:smoke` for route, storage, seed, workflow, and security checks.
- Expanded `npm run verify` into a fuller release-readiness command.
- Added `docs/QA_CHECKLIST.md` and `docs/WORKFLOW_VERIFICATION.md`.
- Updated the admin system page and package version.

## New in v2.5.0

- Added reusable admin list controls for search and filters.
- Added reusable pagination helpers and pagination UI.
- Added search, filtering, and pagination to admin Leads.
- Added search, filtering, and pagination to admin Applications.
- Added search, filtering, and pagination to admin Documents.
- Added search, filtering, and pagination to admin Audit Log.
- Added search, filtering, and pagination to admin Inspections.
- Added search, filtering, and pagination to admin Leases.
- Added search, filtering, and pagination to the admin Ledger activity list.
- Preserved existing create/edit/detail workflows while reducing unbounded admin table queries.

## New in v2.4.0

- Raised the Next.js server action upload body limit to `12mb` so the app-level `10mb` document upload limit works as intended.
- Hardened protected session checks so deactivated users or users whose roles were changed cannot keep using stale role data from an older cookie.
- Added CSV formula-injection protection to exported spreadsheet values.
- Added recurring-charge source metadata and uniqueness safeguards so generated monthly charges are much harder to duplicate.
- Updated recurring charge generation to use stable period keys and gracefully handle duplicate-generation races.
- Tightened payment-plan installment behavior so changing a paid installment away from paid voids the linked ledger payment instead of leaving balances inflated.
- Expanded route inventory checks for nested detail, new, and edit pages.
- Expanded preflight checks for upload limits and recurring-charge schema safeguards.
- Added a v2.4.0 Prisma migration for recurring-charge hardening.

## New in v2.3.0

- Added full ledger CSV export at `/admin/ledger/export`.
- Added balance aging CSV export at `/admin/ledger/aging/export`.
- Added admin reporting hub at `/admin/ledger/reports`.
- Added printable statement list at `/admin/ledger/statements`.
- Added per-application printable statements at `/admin/ledger/statements/[applicationId]`.
- Added per-application CSV statement exports.
- Added applicant-facing printable statement at `/applicant/ledger/statement`.
- Added applicant-facing statement CSV export.
- Added shared CSV and ledger report helper utilities.
- Updated route inventory checks and package version.

## New in v2.2.0

- Added payment plan database models and migration.
- Added admin payment plan center at `/admin/ledger/plans`.
- Added payment plan creation at `/admin/ledger/plans/new`.
- Added payment plan detail pages with installment tracking.
- Added installment statuses for due, paid, missed, and waived.
- Added automatic ledger payment entry creation when a payment-plan installment is marked paid.
- Added payment plan status tracking for active, completed, defaulted, and cancelled plans.
- Added balance aging report at `/admin/ledger/aging`.
- Added payment plan visibility to applicant and landlord ledger pages.
- Added seeded sample payment plan data.
- Updated route checks, README, changelog, and package version.

## New in v2.0.0

- Added ledger database models for charges, payments, credits, and adjustments.
- Added ledger statuses for posted, pending, and voided entries.
- Added payment method tracking for cash, check, money order, card, ACH, and other.
- Added admin ledger center at `/admin/ledger`.
- Added admin ledger entry creation at `/admin/ledger/new`.
- Added ledger entry detail and void workflow at `/admin/ledger/[id]`.
- Added open balance summaries and recent activity.
- Added ledger entries connected to units, applications, and tenant/applicant users.
- Added landlord ledger visibility scoped to owned units at `/landlord/ledger`.
- Added applicant ledger visibility scoped to the signed-in applicant/tenant at `/applicant/ledger`.
- Added seeded sample ledger charge and payment records.
- Added v2.0.0 Prisma migration.
- Updated route checks, dashboard cards, system page, security checklist, and package version.

## Important note about payments

HomeBase MLS v2.6.7 does **not** collect or transmit money. The ledger records charges, payments, credits, and adjustments that were entered by staff. Online payment provider integration should be a later update after the ledger is tested and permission rules are confirmed.

## Local setup

```bash
npm install
npm run db:setup
npm run preflight
npm run routes:check
npm run storage:verify
npm run seed:verify
npm run workflow:verify
npm run security:verify
npm run typecheck
npm run build
npm run dev
```

## Seed logins

Admin:

```text
admin@homebase.local
admin12345
```

Landlord:

```text
landlord@homebase.local
landlord12345
```

Applicant:

```text
applicant@homebase.local
applicant12345
```

## Environment

Copy `.env.example` to `.env` and update values for your local database, auth secret, upload directory, and email provider.

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/homebase_mls"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/homebase_mls"
AUTH_SECRET="replace-with-at-least-32-random-characters"
DOCUMENT_STORAGE_PROVIDER="database"
DOCUMENT_UPLOAD_DIR="./storage/documents"
EMAIL_PROVIDER="console"
EMAIL_FROM="HomeBase MLS <no-reply@example.com>"
EMAIL_SEND_ON_QUEUE="false"
RESEND_API_KEY=""
EMAIL_WEBHOOK_URL=""
```

## Known limits before production

- The auth system is a local scaffold. Consider Clerk, Auth.js, or Supabase Auth before public SaaS use.
- The document system uses local protected storage by default. Use private object storage for production.
- The email provider abstraction exists, but actual delivery depends on your configured provider.
- The ledger records payment history but does not process payments.
- This release adds stronger verification scripts, but you should still run `npm run verify`, `npm run build`, and a full manual workflow test before public deployment.
- Ledger entries can be voided, but not edited. This is intentional for auditability.
- Full accounting exports, payment provider reconciliation, and online payment processing are not included yet.

## Suggested next update

The next update should be **v2.7.0: automated regression test scaffolding or online-payment readiness planning**, depending on whether you want to keep hardening first or begin preparing payment-provider integration.


## v2.1.0 Recurring Charges

This release adds recurring monthly charge schedules to the rent and payment ledger. Admins can create monthly schedules for rent or recurring fees, optionally track tenant and subsidy portions, and generate due charges through a selected run-through date. The generator records a recurring schedule ID and monthly period key on generated charges so reruns are safer during month-end work.

New admin routes:

- `/admin/ledger/schedules`
- `/admin/ledger/schedules/new`
- `/admin/ledger/schedules/[id]`

Recurring charges are still ledger records only. This release does not process online payments or send payment requests.


## v2.2.0 Payment Plans and Aging

This release adds payment plans and a balance aging workflow. Admins can create installment plans, track due/paid/missed/waived installments, and review account balances by aging bucket. Applicants and landlords can see relevant payment plan summaries from their ledger pages.

New admin routes:

- `/admin/ledger/plans`
- `/admin/ledger/plans/new`
- `/admin/ledger/plans/[id]`
- `/admin/ledger/aging`

Payment plans are still recordkeeping tools only. Marking an installment paid creates a ledger payment entry, but HomeBase MLS does not collect money online in this release.

## v2.6.3 Vercel/Prisma hotfix

- Replaced `next.config.ts` with Vercel-compatible `next.config.mjs`.
- Updated the build script to run `prisma generate` before `next build`.
- Added `postinstall` Prisma generation for Vercel installs.
- Fixed the missing Prisma back-relation from `Unit` to `Inspection`.


## v2.6.7 Vercel note

This patch adds React server-action form typings so Vercel builds can accept server actions used directly in form `action` props.


## Vercel build note

v2.6.7 fixes a strict TypeScript issue in the protected document download route where Vercel could not infer that a document exists after access is allowed.

### Vercel note for v2.6.8

This package includes an AppHeader TypeScript build fix for Vercel. Replace your repository files with this package, commit, push, and redeploy the newest commit without build cache.


### Vercel hotfix v2.6.9

This package includes the Vercel build fixes from v2.6.1 through v2.6.9, including Prisma generation before build, the `next.config.mjs` config file, schema relation fixes, and stricter TypeScript fixes for server actions, routes, components, and Prisma JSON metadata.

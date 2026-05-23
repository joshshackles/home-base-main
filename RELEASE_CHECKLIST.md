# HomeBase MLS v4.61.5 Enterprise Release Checklist

Use this checklist as the final production-readiness gate before promoting the v4.61.5 enterprise build.

## Required Automated Checks

Run these from a clean checkout with Node 20.x and npm 10.x:

```bash
npm install
npx prisma validate
npx prisma generate
npx prisma migrate status
npm run migrations:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

For seeded smoke testing, also run:

```bash
npm run seed
npm run test:e2e:smoke -- --project=chromium
npm run test:e2e:workflow -- --project=chromium
npm run test:e2e -- --project=mobile-chrome
```

## Critical Workflow Smoke Tests

- Public marketplace search: filters, sorting, empty state, saved-search panel, and public listing visibility.
- Listing detail: photos, address privacy display, listing quality fields, inquiry form, showing/apply entry points.
- Public inquiry: public inquiry creates or updates a lead/guest card, links a conversation, dedupes repeat inquiries, and blocks inactive listings.
- Renter registration/sign-in: account creation, login, role routing, and unauthorized route redirects.
- Reusable renter profile: basic info, household, income, employment, pets, vehicles, references, assistance, document wallet, and readiness score.
- Application submission: active listing only, stepper progress, profile sharing consent, document sharing, screening authorization placeholder, and final submission.
- Landlord application review: structured applicant summary, household/income/documents, fair-housing-safe actions, message thread, and guessed-ID protection.
- Lease/document signature: lease packet, signature queue, document timeline, shared/revoked documents, and signer-only visibility.
- Tenant dashboard: rent, lease, notices, messages, maintenance, inspections, documents, and next actions.
- Tenant ledger/payment visibility: tenant sees only own ledger/payment status; no other tenant balances or payment methods leak.
- Maintenance request with media: tenant upload validation, photos/videos linked to work order, landlord view, vendor assigned-only view.
- Landlord work-order management: state-machine transitions, vendor assignment, estimate/invoice review, owner approval where configured.
- Inspection creation/completion: template checklist, photo evidence, correction items, reinspection scheduling, and report visibility.
- Admin command center: imports, exports, data quality, repairs, backups, integrations, automations, impersonation audit, and security events.

## Role Permission Gate

Run guessed-ID read and mutation checks for every role:

- applicant cannot access another applicant application, lease packet, document, message, screening report, maintenance request, or program case.
- tenant cannot access another tenant ledger, payment, lease, notice, document, maintenance request, or inspection.
- landlord cannot access another landlord property, unit, application, lead, ledger, document, report, work order, inspection, or owner statement.
- property manager can access only assigned portfolios/properties/units and cannot cross into unrelated owner data.
- vendor can access only assigned work orders, shared documents/media, estimates, invoices, and field notes.
- inspector can access only assigned inspections and authorized reports/evidence.
- owner client can access assigned portfolio/property summaries, owner statements, shared owner documents, and permitted maintenance approvals only.
- caseworker can access assigned program cases, participant documents, RFTA, voucher, inspection, and message records only.
- program admin can access cases scoped to their program/organization/housing authority only.
- admin follows the intended admin access pattern without super-admin-only sample data or impersonation privileges.
- super admin can use governed support tools with audit logs and expiration controls.

## Accessibility And Mobile QA

- Check semantic headings and one visible page heading on every critical route.
- Verify form labels or accessible names for inputs, selects, textareas, buttons, and links.
- Navigate dashboards, dialogs, drawers, command palette, tabs, and forms with keyboard only.
- Confirm focus states are visible and not clipped.
- Confirm dialogs expose `role="dialog"` or `alertdialog`, `aria-modal` where appropriate, and a close path.
- Check contrast manually on status badges, warning panels, disabled controls, and dense table rows.
- Verify no horizontal overflow at 390px width for marketplace, renter profile/application, tenant dashboard, landlord dashboard, unit workspace, and vendor field mode.

## Performance Review

- Confirm large list pages use pagination helpers and database-side search/filtering.
- Review missing composite indexes after observing real query plans for marketplace search, inbox, tenant directory, unit workspace, reports, ledgers, and admin command center.
- Review N+1 risk anywhere a page maps records and then performs per-record Prisma calls.
- Current static review items to resolve before high-volume launch:
  - `src/app/landlord/documents/page.tsx` still caps at `take: 500`.
  - `src/app/landlord/tenants/page.tsx` still caps at `take: 500`.
  - `src/lib/reports/index.ts` still uses several `take: 500` report queries.
  - `src/lib/billing/engine.ts` still uses `take: 500` batch reads and should be converted to cursor/idempotent chunk processing before production-scale billing.

## Production Setup

- Environment variables: verify `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL`, `CRON_SECRET`, storage, email/SMS, payment, screening, map/geocoding, and webhook secrets.
- Database migration: run `npx prisma migrate status`, deploy committed migrations, then run `npx prisma generate`.
- Seed/sample data: do not run sample seed in production unless this is a deliberate sandbox; keep `ALLOW_SAMPLE_DATA_IN_PRODUCTION` unset for real launches.
- Payment provider: configure Stripe keys/webhooks only in the production secret store; test webhook idempotency and replay behavior.
- Storage setup: verify S3/R2 bucket, public/private access rules, signed download paths, file type limits, and document/media guessed-ID protection.
- Email/SMS provider setup: verify queued delivery mode, unsubscribe/opt-out behavior, bounce handling, and provider webhooks.
- Screening provider setup: keep mock provider in non-production only; enable a real provider behind feature flags after legal/provider validation.
- Map/geocoding provider setup: do not publish fake coordinates; configure provider keys only when address privacy modes and geocode confidence are ready.
- Known feature flags: document any disabled provider-backed flows, including SMS, screening, live geocoding, syndication, lockbox/calendar sync, and accounting sync.

## Environment Variable Gate

Minimum variables to review before pilot/demo:

- Core app: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL`.
- Cron/jobs: `CRON_SECRET`, `EMAIL_QUEUE_BATCH_SIZE`, `EMAIL_MAX_ATTEMPTS`.
- Storage: `DOCUMENT_STORAGE_PROVIDER`, `DOCUMENT_UPLOAD_DIR` for local only, `DOCUMENT_S3_BUCKET`, `DOCUMENT_S3_REGION`, `DOCUMENT_S3_ENDPOINT`, `DOCUMENT_S3_ACCESS_KEY_ID`, `DOCUMENT_S3_SECRET_ACCESS_KEY`, `DOCUMENT_S3_PREFIX`, `DOCUMENT_S3_FORCE_PATH_STYLE`, `DOCUMENT_S3_SERVER_SIDE_ENCRYPTION`.
- Email: `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_SEND_ON_QUEUE`, `RESEND_API_KEY`, `EMAIL_WEBHOOK_URL`.
- Spam/rate limits: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `REQUIRE_TURNSTILE`, `RATE_LIMIT_FAIL_OPEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Payments: `NEXT_PUBLIC_STRIPE_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLATFORM_FEE_PERCENT`, `STRIPE_PLATFORM_FEE_FIXED_CENTS`.
- Deployment controls: `VERCEL_RUN_MIGRATIONS`, `VERCEL_SKIP_MIGRATIONS`, `VERCEL_STRICT_ENV`, `REQUIRE_CRON_SECRET`.

Provider variables for screening, SMS, geocoding/maps, accounting/QuickBooks, and MLS/RESO must be documented before enabling those features. Do not treat provider scaffolds as live integrations until credentials, webhooks, audit logs, and failure handling are verified.

## Provider Setup Gates

- Payment provider: complete Stripe webhook replay/idempotency, refund/dispute handling, reconciliation, payment method permission checks, and ledger posting tests.
- Screening provider: complete legal review, applicant authorization, provider contract review, adverse-action process, report retention policy, and role-safe report summary display.
- Email/SMS provider: complete opt-out/unsubscribe behavior, quiet hours if enabled, bounce/failure handling, delivery retry policy, and notification preference checks.
- Geocoding/map provider: complete address privacy review, coordinate confidence handling, approximate/hidden pin behavior, and no-fake-coordinate validation.
- Accounting/QuickBooks provider: complete account mapping review, owner statement reconciliation, export audit, and non-destructive sync strategy.
- MLS/RESO provider: complete field mapping, listing completeness validation, syndication status visibility, failed export handling, and safe import draft creation.
- Storage provider: complete signed download, upload validation, malware/content policy if required, and guessed-ID tests for every file/media route.

## Rollback

- Prefer application rollback through the hosting platform first.
- Do not blindly roll back schema after migrations; freeze affected writes and restore from provider snapshot only after review.
- For data issues, create an export snapshot, document the repair, run the smallest safe repair action, and audit the actor/reason.
- For payment, document, screening, or webhook incidents, disable the integration route/secret first, then reconcile provider events before reopening.

## Manual Smoke Sign-Off

- Desktop and mobile: `/`, `/marketplace`, listing detail, `/signup`, `/login`.
- Applicant/renter: `/applicant`, `/applicant/profile`, `/applicant/applications`, `/applicant/documents`, `/applicant/leases`.
- Tenant: `/tenant`, `/tenant/ledger`, `/tenant/payments`, `/tenant/maintenance`, `/tenant/documents`, `/tenant/inbox`.
- Landlord/property manager: `/landlord`, `/landlord/property-unit-manager`, unit workspace, `/landlord/applications`, `/landlord/maintenance`, `/landlord/documents`, `/landlord/reports`.
- Vendor: `/vendor/field`, work order detail, estimate, invoice, media upload.
- Inspector: `/inspector`, inspection checklist, report view.
- Owner client: `/owner`, statements, shared documents, maintenance approvals.
- Participant/caseworker/program: `/participant`, `/caseworker`, case detail, RFTA, documents, inspections, subsidy status.
- Admin/super admin: `/admin`, `/admin/command-center`, `/admin/governance`, `/admin/integrations`, `/admin/security`, `/admin/reports`, `/admin/automations`, `/admin/super-admin`, `/admin/impersonation`, `/admin/system`.

## Final Enterprise Journey Smoke Tests

- Renter searches and applies: homepage to marketplace to listing detail to inquiry/tour/application with active listing guard and consent/success state.
- Landlord creates listing and reviews lead/application: inventory/unit to listing builder to lead pipeline to application review with decision actions and message link.
- Tenant submits maintenance request: maintenance request form with media upload, success state, status education, and request detail.
- Vendor updates assigned work order: field queue to detail to status update, note, media upload, estimate, and invoice.
- Inspector completes checklist: inspection queue to checklist to required items, photo evidence, review, submit, report/correction links.
- Owner views statement/approval: owner dashboard to statement and maintenance approval without applicant PII or internal notes.
- Participant tracks RFTA/documents: participant dashboard to RFTA/document milestones with only participant-safe subsidy/status details.
- Caseworker reviews case/RFTA: caseworker queue to case detail to RFTA packet, documents, inspections, subsidy, messages, and timeline.
- Admin reviews platform issue: command center to governance/integration/security drilldown with status badges and audit cues.
- Super admin reviews integration/API/governance tools: super-admin console to API/webhooks, integration health, impersonation, backup/restore, and data quality tools.

## Release Documents To Update Before Sign-Off

- `UX_RELEASE_READINESS.md`: final UX status, pilot-only areas, scaffolded areas, provider setup, legal/compliance review, route review, and journey smoke tests.
- `KNOWN_RISKS.md`: feature scaffolds, provider placeholders, compliance limitations, accessibility/mobile gaps, financial safety gaps, security/testing gaps, and pilot guardrails.
- `UX_SCREENSHOT_INVENTORY.md`: update with actual desktop/mobile screenshot paths once `npm run dev` can run.
- `ACCESSIBILITY_MOBILE_QA.md`: use as the manual accessibility checklist until automated axe/Playwright checks are added.

## Known Risks

- This release includes many new schema surfaces; run migration validation against a production-like copy before real data migration.
- Optional E2E role checks require seeded credentials through `E2E_TENANT_EMAIL`, `E2E_VENDOR_EMAIL`, `E2E_OWNER_CLIENT_EMAIL`, `E2E_CASEWORKER_EMAIL`, and `E2E_SUPER_ADMIN_EMAIL`.
- No automated axe/contrast dependency is currently installed; accessibility checks are a mix of Playwright structural assertions and manual QA.
- Payment, screening, SMS, MLS/RESO, geocoding, accounting sync, lockbox, and external calendar integrations remain provider scaffolds unless production credentials and legal/provider review are complete.

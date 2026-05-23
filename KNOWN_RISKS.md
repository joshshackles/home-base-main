# HomeBase MLS Known Risks

Date: 2026-05-21  
Version target: v4.61.5 enterprise pilot/demo readiness

This file is intentionally blunt. It distinguishes pilot/demo readiness from production readiness so the platform can be evaluated safely.

## Current Verification Blocker

- This workspace cannot run `npm`, `npx`, Prisma CLI, Vitest, Playwright, or Next build because `npm` and `npx` are not available on PATH and `node_modules` is absent.
- `node.exe` is available through the Codex bundled runtime, but the project package manager is not.
- No live browser screenshots, accessibility scans, migration validation, unit tests, e2e tests, or production build were completed in this environment.
- This appears pre-existing/environmental, not caused by the release documentation update.

## Feature Scaffolds

- Affordable housing/PHA workflows are broad and structured but should be treated as configurable workflow scaffolding until validated against real program requirements.
- RFTA, landlord packet, HAP/subsidy, payment standards, utility allowance, affordability, rent reasonableness, and certification/recertification workflows require domain/legal review before official use.
- Reporting, saved reports, scheduled reports, exports, accounting exports, MLS/RESO mapping, and provider diagnostics are foundations; live integrations and background jobs require hardening.
- Backup/restore tracking is governance metadata unless connected to real backup provider infrastructure.
- Preventive maintenance, inspections, vendor finance, owner approvals, and asset tracking should be piloted with internal/test data before operational reliance.

## Provider Placeholders

- Payment provider: Stripe variables exist, but real payment collection requires webhook verification, idempotency, refunds/disputes, reconciliation, and production secret setup.
- Screening provider: mock/dev screening must not be used as real applicant screening.
- Email/SMS provider: queues/preferences exist, but production delivery requires provider credentials, opt-out compliance, bounce handling, and delivery logs.
- Geocoding/map provider: coordinate fields and privacy modes exist; do not invent fake coordinates.
- Accounting/QuickBooks provider: mapping/export scaffolds exist; live sync requires provider setup and accounting review.
- MLS/RESO/syndication provider: export/import/status scaffolds exist; no live MLS feed should be assumed.
- Lockbox and external calendar integrations are not production-connected.

## Compliance Limitations

- Fair-housing-safe copy and decision workflows still require legal review.
- Tenant screening authorization, adverse action, data retention, and report access must be reviewed before live screening.
- Affordable housing workflows must not claim official HUD/LIHTC/HQS/NSPIRE/TRACS/50058 compliance unless the requirements, forms, exports, and templates are validated.
- Payment standards, FMR/SAFMR, utility allowance, RFTA, HAP, and certification workflows depend on local program policy and should remain configurable.
- Owner/client financial statements, trust accounting, deposits, refunds, write-offs, and owner payouts require accounting review.

## Accessibility Gaps

- No automated axe dependency is installed or verified in this workspace.
- The app needs live keyboard and screen-reader QA for dashboard shell, mobile drawer, command palette, dialogs, drawers, tabs, filters, and form-heavy workflows.
- Tables and complex admin/finance pages may still need additional captions, row headers, mobile alternatives, and focus management.
- Color contrast should be manually checked for status badges, warnings, disabled controls, and dense dashboard cards.
- Listing image alt text, maintenance media labels, inspection evidence labels, and document links need live content validation.

## Mobile Gaps

- Table-heavy pages remain a mobile risk: landlord inventory/property-unit manager, tenant/household directory, landlord applications, financial pages, owner statements, caseworker cases, admin users, reports, and governance pages.
- Sticky mobile CTAs and tabs should be checked for content overlap on listing detail, application flow, unit workspace, and vendor/inspector field workflows.
- Mobile upload UX for tenant maintenance, vendor field media, inspection evidence, and document wallet requires live device/browser testing.

## Financial Safety Gaps

- Real-money flows must remain disabled until provider credentials, webhook replay/idempotency, ledger posting, refunds, disputes, and reconciliation pass tests.
- Financial exports need audit confirmation, row counts, filters, sensitive-field indicators, and guessed-ID checks.
- Tenant versus subsidy ledger summaries require permission testing so participants only see product-approved information.
- Owner statements, owner distributions, trust/deposit liabilities, and accounting exports require accounting/legal review before production.
- Manual payments, adjustments, voids, reversals, refunds, and chargebacks require confirmation, reason capture, and audit evidence.

## Security And Permission Risks

- Guessed-ID tests must run for every sensitive area: ledgers, payments, applications, screening, documents, maintenance media, inspection evidence, owner statements, program cases, RFTAs, HAP/subsidy, API keys, webhooks, imports/exports, and impersonation.
- Support impersonation must be verified for reason capture, expiration, visible banner, audit events, and restricted sensitive actions.
- API keys must never be displayed after creation; only prefixes/scopes/status should be visible.
- Webhook secrets and provider tokens must be masked and never logged.
- Admin and super-admin tools must stay separated so normal admins are not given platform-level recovery or impersonation powers.

## Testing Gaps

- The following commands could not run in this workspace: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`, `npx prisma validate`, `npx prisma generate`, and `npx prisma migrate status`.
- Browser smoke testing could not run because the app could not start.
- Route screenshots remain unavailable until the Node/npm toolchain is restored.
- Seeded credentials and fixture data are required for meaningful role-based smoke tests.
- E2E flows should run across at least Chromium desktop and a mobile viewport before pilot sign-off.

## Performance And Scale Risks

- Large-list pages should be re-reviewed against production-like data volume.
- Existing static review flagged remaining `take: 500` patterns in landlord documents, landlord tenants, report helpers, and billing batch code.
- Query plans and indexes should be reviewed for marketplace search, inbox, tenant directory, unit workspace, ledgers, reports, admin command center, and program case queues.
- Background jobs should use idempotent batch/cursor processing before high-volume launch.

## Pilot Guardrails

- Use seeded/demo data only unless all legal, provider, security, and financial checks pass.
- Keep mock screening, disabled SMS, fake provider status, and scaffolded provider integrations clearly labeled.
- Do not process real payments, issue real screening reports, send real SMS/email at scale, publish real MLS feeds, or rely on official affordable housing compliance outputs until their provider/legal reviews are complete.

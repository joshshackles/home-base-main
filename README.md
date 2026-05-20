# HomeBase MLS

Premium housing operations platform for properties, units, leads, applications, documents, inspections, lease packets, e-signature evidence, notifications, communication, payments, and ledgers.

Current package version: **4.61.0**

## What is included

- Admin, landlord, applicant, and marketplace portals.
- Unified housing OS brand system with geometric HomeBase mark, favicon/app icon, grouped dashboard shell, and shared UI primitives.
- Operational coherence cockpit that standardizes next-best work, inbox, records, money, and activity across dashboards.
- Property/unit inventory management.
- Public lead capture with anti-spam protections.
- Applications, documents, inspections, leases, signatures, and ledger workflows.
- Applicant application readiness scoring, checklist guidance, and stronger submit validation.
- Document storage abstraction with local, database, and S3/R2-compatible providers.
- PDF generation using `pdf-lib`.
- E-signature consent/evidence hashing.
- Security headers, password policy hardening, durable rate limiting, and DB-verified session checks.
- Email queue hardening and cron-compatible sending route.
- Stripe Connect, tenant checkout, scheduled payments, autopay, retry recovery, refunds, disputes, payout events, webhook idempotency logs, receipts, and landlord reconciliation views.
- Vitest test scaffolding, structured logging, and verification scripts.
- End-to-end workflow QA matrix for discovery, applicant, landlord, maintenance, messaging, admin, and finance paths.
- Admin workflow readiness center that scores core product promises as proven, covered, basic, or underdeveloped.
- Unified rental lifecycle engine for listing, application, lease, move-in, resident, renewal, notice, turnover, hold, and archive states.
- Vercel-safe npm lockfile with public registry tarball URLs, pinned Node 20, and lockfile verification.
- SEO, accessibility, and legal-page starter polish.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```


## Vercel automatic migrations

Production Vercel deployments now run `npm run vercel:migrate` before `next build`. The migration runner uses `prisma migrate deploy` when Prisma migration history already exists. If it detects an existing Neon database with application tables but no Prisma migration history, it first runs a one-time safe schema sync with `prisma db push --skip-generate`, records the current migrations as applied, and lets future deployments use normal migration deploys.

Automatic migrations run by default only when `VERCEL_ENV=production`. Set `VERCEL_RUN_MIGRATIONS=1` to force migrations in another environment, or `VERCEL_SKIP_MIGRATIONS=1` to skip them during an emergency deploy. Keep `DIRECT_URL` pointed at the direct Neon connection string so Prisma migrations do not use the pooled app connection.

## Production verification

```bash
npm run verify
npm run build
```

For Vercel install issues, run:

```bash
npm run lockfile:verify
```

For faster smoke checks:

```bash
npm run qa:smoke
```

## Important production notes

- Configure `APP_URL` in production. The app intentionally fails closed for production links when it is missing.
- Use object storage (`DOCUMENT_STORAGE_PROVIDER=s3`) for production documents.
- Configure `CRON_SECRET` before enabling queued email cron delivery.
- Review Privacy, Terms, Fair Housing, and Accessibility pages with counsel before public launch.
- Replace any scaffolded authentication with the production auth plan before exposing this as a public SaaS.
- This clean-foundation package is intended for fresh installs. It ships one squashed baseline migration plus newer product migrations, not the historical development chain.

## Documentation

Update docs live in `docs/`, including:

- `UPDATE_2_LEAD_SPAM_PROTECTION.md`
- `UPDATE_5_SECURITY_HEADERS.md`
- `ENTERPRISE_PUBLIC_HOMEPAGE.md`
- `ROLE_CLARITY_NEXT_ACTION.md`
- `DEDICATED_TENANT_PORTAL.md`
- `APPLICANT_JOURNEY_SIMPLIFICATION.md`
- `MARKETPLACE_SEARCH_V2.md`
- `MARKETPLACE_MAP_LIST_EXPERIENCE.md`
- `UPDATE_6_OBJECT_STORAGE.md`
- `UPDATE_7_PDF_GENERATOR.md`
- `e-signature-evidence.md`
- `UPDATE_9_SESSION_CORRECTNESS.md`
- `update-10-email-queue-production-env.md`
- `UPDATE_11_TESTS_OBSERVABILITY.md`
- `UPDATE_12_PRODUCTION_POLISH.md`
- `PRODUCT_IDENTITY_UX_SYSTEM.md`
- `END_TO_END_WORKFLOW_QA.md`
- `WORKFLOW_READINESS_CENTER.md`
- `UNIFIED_RENTAL_LIFECYCLE_ENGINE.md`

## Changelog

See `CHANGELOG.md`.


## Vercel deployment

This package includes `vercel.json`, a dedicated `npm run vercel-build` command, and `npm run vercel:preflight`. See `docs/VERCEL_DEPLOYMENT.md` before deploying.

# HomeBase MLS

Production-oriented rental marketplace and housing workflow system for properties, units, leads, applications, documents, inspections, lease packets, e-signature evidence, notifications, and ledgers.

Current package version: **3.0.3**

## What is included

- Admin, landlord, applicant, and marketplace portals.
- Property/unit inventory management.
- Public lead capture with anti-spam protections.
- Applications, documents, inspections, leases, signatures, and ledger workflows.
- Document storage abstraction with local, database, and S3/R2-compatible providers.
- PDF generation using `pdf-lib`.
- E-signature consent/evidence hashing.
- Security headers, password policy hardening, durable rate limiting, and DB-verified session checks.
- Email queue hardening and cron-compatible sending route.
- Vitest test scaffolding, structured logging, and verification scripts.
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

## Production verification

```bash
npm run verify
npm run build
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

## Documentation

Update docs live in `docs/`, including:

- `UPDATE_2_LEAD_SPAM_PROTECTION.md`
- `UPDATE_5_SECURITY_HEADERS.md`
- `UPDATE_6_OBJECT_STORAGE.md`
- `UPDATE_7_PDF_GENERATOR.md`
- `e-signature-evidence.md`
- `UPDATE_9_SESSION_CORRECTNESS.md`
- `update-10-email-queue-production-env.md`
- `UPDATE_11_TESTS_OBSERVABILITY.md`
- `UPDATE_12_PRODUCTION_POLISH.md`

## Changelog

See `CHANGELOG.md`.


## Vercel deployment

This package includes `vercel.json`, a dedicated `npm run vercel-build` command, and `npm run vercel:preflight`. See `docs/VERCEL_DEPLOYMENT.md` before deploying.

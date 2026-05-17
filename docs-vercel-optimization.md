# Vercel optimization pass

This build is tuned for Vercel serverless deployment with Prisma and dynamic dashboards.

## What changed

- Database-backed pages and export routes now opt out of static prerendering with `export const dynamic = "force-dynamic"`.
- Route handlers that use auth/database state now explicitly use the Node.js runtime with `export const runtime = "nodejs"`.
- `next.config.mjs` now traces Prisma schema/migration files into the deployment bundle.
- Prisma packages are listed as server external packages for cleaner serverless bundling.
- `scripts/verify-vercel.ts` now validates the new deployment safeguards.
- Vercel preflight no longer assumes S3 when no storage provider is set. It defaults like the app does: database in production, local in development.
- Added `vercel-build:no-migrate` as an emergency/preview build option when migrations are intentionally handled outside the Vercel build.

## Recommended Vercel env vars

Required for production:

- `DATABASE_URL` pooled database URL
- `DIRECT_URL` non-pooled/direct database URL for Prisma migrations
- `AUTH_SECRET` 32+ random characters
- `APP_URL` production HTTPS URL

Strongly recommended:

- `CRON_SECRET`
- `EMAIL_PROVIDER=resend` with `RESEND_API_KEY`, or `EMAIL_PROVIDER=disabled`
- `DOCUMENT_STORAGE_PROVIDER=s3` plus S3/R2 credentials for real document scale

## Build command

Default Vercel build command remains:

```bash
npm run vercel-build
```

That runs:

```bash
npm run vercel:preflight && prisma generate && prisma migrate deploy && next build
```

Use `npm run vercel-build:no-migrate` only if migrations are handled by a separate deployment step.

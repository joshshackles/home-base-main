# Vercel Deployment Checklist

This package is configured for Vercel with `vercel.json`.

## Build command

Vercel runs:

```bash
npm run vercel-build
```

That command runs:

1. `npm run vercel:preflight`
2. `npm run lockfile:verify`
3. `npm run clean-install:verify`
4. `npm run first-release:verify`
5. `npm run permission-matrix:verify`
6. `npm run authorization-runtime:verify`
7. `npm run protected-routes:verify`
8. `npm run middleware-static:verify`
9. `npm run environment-contract:verify`
10. `npm run payments-production:verify`
11. `npm run vercel:migrate`
12. `prisma generate`
13. `next build`

## Database migration policy

Vercel builds run the guarded migration runner:

```bash
npm run vercel:migrate
```

The runner is controlled by deployment environment and the `VERCEL_RUN_MIGRATIONS` / `VERCEL_SKIP_MIGRATIONS` flags. Use `VERCEL_SKIP_MIGRATIONS=1` only as an emergency deployment bypass after confirming the database schema is already current.

## Required production environment variables

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
APP_URL=https://your-domain.com
CRON_SECRET=
```

Use the exact names `DATABASE_URL` and `DIRECT_URL`. The Prisma schema reads those environment variables directly.

## Recommended document storage

Use S3-compatible storage on production Vercel deployments:

```env
DOCUMENT_STORAGE_PROVIDER=s3
DOCUMENT_S3_BUCKET=
DOCUMENT_S3_REGION=auto
DOCUMENT_S3_ENDPOINT=
DOCUMENT_S3_ACCESS_KEY_ID=
DOCUMENT_S3_SECRET_ACCESS_KEY=
DOCUMENT_S3_PREFIX=documents
DOCUMENT_S3_FORCE_PATH_STYLE=false
DOCUMENT_S3_SERVER_SIDE_ENCRYPTION=AES256
```

`DOCUMENT_STORAGE_PROVIDER=database` is deployable but should only be used for small/private deployments. `local` is not durable on Vercel serverless deployments.

## Cron

This package is configured for **Vercel Hobby** until full production rollout. Hobby cron jobs may run no more frequently than once per day, so `vercel.json` registers daily processors:

```txt
/api/cron/send-queued-email - 0 3 * * *
/api/cron/process-payments - 15 8 * * *
```

Set `CRON_SECRET` in Vercel Project Settings before relying on scheduled email or payment processing. Vercel Cron will send it as a bearer token when the environment variable exists.

For Hobby/demo builds, the preflight check now warns instead of failing when `CRON_SECRET` is not set. This keeps deployment unblocked while configuration is still being finalized. The cron endpoint still rejects scheduled requests until the secret exists, so add it before testing the queue. To make missing `CRON_SECRET` fail the build again, set either:

```env
VERCEL_STRICT_ENV=1
# or
REQUIRE_CRON_SECRET=true
```

### Production upgrade note

When the project moves to Vercel Pro, cron schedules can be increased to more production-ready intervals, for example:

```json
[
  {
    "path": "/api/cron/send-queued-email",
    "schedule": "*/5 * * * *"
  },
  {
    "path": "/api/cron/process-payments",
    "schedule": "*/15 * * * *"
  }
]
```

Keep the daily schedule while the project remains on Hobby, or deployment can fail because of unsupported cron frequency.

## Verify locally before deploy

```bash
npm ci
npm run vercel:preflight
npm run clean-install:verify
npm run first-release:verify
npm run permission-matrix:verify
npm run authorization-runtime:verify
npm run protected-routes:verify
npm run middleware-static:verify
npm run environment-contract:verify
npm run migrations:check
npm run typecheck
npm run test
```

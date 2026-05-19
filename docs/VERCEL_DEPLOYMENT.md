# Vercel Deployment Checklist

This package is configured for Vercel with `vercel.json`.

## Build command

Vercel runs:

```bash
npm run vercel-build
```

That command runs:

1. `npm run vercel:preflight`
2. `prisma generate`
3. `prisma migrate deploy`
4. `next build`

## Required production environment variables

```env
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
APP_URL=https://your-domain.com
CRON_SECRET=
```

For Neon/Vercel Postgres, the app also accepts these aliases:

```env
POSTGRES_PRISMA_URL=
POSTGRES_URL=
NEON_DATABASE_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_URL_NON_POOLING_DIRECT=
NEON_DIRECT_URL=
```

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

This package is configured for **Vercel Hobby** until full production rollout. Hobby cron jobs may run no more frequently than once per day, so `vercel.json` registers the queued-email processor once daily:

```txt
/api/cron/send-queued-email — 0 3 * * *
```

Set `CRON_SECRET` in Vercel Project Settings before relying on scheduled email processing. Vercel Cron will send it as a bearer token when the environment variable exists.

For Hobby/demo builds, the preflight check now warns instead of failing when `CRON_SECRET` is not set. This keeps deployment unblocked while configuration is still being finalized. The cron endpoint still rejects scheduled requests until the secret exists, so add it before testing the queue. To make missing `CRON_SECRET` fail the build again, set either:

```env
VERCEL_STRICT_ENV=1
# or
REQUIRE_CRON_SECRET=true
```

### Production upgrade note

When the project moves to Vercel Pro, the queued email cron can be increased to a more production-ready interval, for example:

```json
{
  "path": "/api/cron/send-queued-email",
  "schedule": "*/5 * * * *"
}
```

Keep the daily schedule while the project remains on Hobby, or deployment can fail because of unsupported cron frequency.

## Verify locally before deploy

```bash
npm install
npm run vercel:preflight
npm run typecheck
npm run test
```

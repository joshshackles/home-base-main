# Update 10 — Email Queue + Production Environment Hardening

This update hardens production email delivery and public-link generation.

## What changed

- `APP_URL` now fails closed in production when missing.
- `APP_URL` must use HTTPS in production.
- Queued signature notification sends now use durable retry metadata:
  - `attemptCount`
  - `nextAttemptAt`
- Failed sends are retried with exponential backoff until `EMAIL_MAX_ATTEMPTS` is reached.
- A protected cron endpoint was added at:
  - `/api/cron/send-queued-email`
- The manual script now prints queue stats before and after processing.
- Admin notification history now shows attempt counts and next retry time.

## Required migration

```bash
npx prisma migrate deploy
```

## Required production env

```env
APP_URL="https://your-production-domain.com"
EMAIL_PROVIDER="resend"
EMAIL_FROM="HomeBase MLS <no-reply@your-domain.com>"
RESEND_API_KEY="..."
CRON_SECRET="a-long-random-secret"
EMAIL_QUEUE_BATCH_SIZE="50"
EMAIL_MAX_ATTEMPTS="5"
```

## Vercel cron example

Create a cron job that calls:

```txt
GET /api/cron/send-queued-email
Authorization: Bearer $CRON_SECRET
```

A schedule of every 5–15 minutes is usually appropriate.

## Local/manual processing

```bash
npm run email:send-queued
```

## Verification

```bash
npm run email:verify
```

This checks the queue hardening, cron protection, retry fields, and production link safeguards.

# Environment Contract

HomeBase MLS must fail loudly when production configuration is unsafe, and it must explain demo/Hobby warnings clearly when a deployment is intentionally not fully production-scaled yet.

## Required For Any Real Deployment

| Key | Purpose | Production rule |
| --- | --- | --- |
| `DATABASE_URL` | Prisma app database connection | Required. Prisma reads this exact key. |
| `DIRECT_URL` | Direct migration database connection | Required for Vercel migration-safe deploys. |
| `AUTH_SECRET` | Session signing and auth security | Required, unique, and at least 32 characters. Placeholder values are rejected. |
| `APP_URL` | Password reset, signature, Stripe, and email links | Required in production and must use HTTPS. |

## Required For Durable Document Storage

| Key | Purpose | Production rule |
| --- | --- | --- |
| `DOCUMENT_STORAGE_PROVIDER` | `local`, `database`, or `s3` document storage selector | Use `s3` for production scale. `database` is allowed for small/private deployments with a warning. `local` is rejected in production. |
| `DOCUMENT_S3_BUCKET` | S3/R2 bucket name | Required when `DOCUMENT_STORAGE_PROVIDER=s3`. |
| `DOCUMENT_S3_REGION` | S3/R2 region | Required when `DOCUMENT_STORAGE_PROVIDER=s3`. |
| `DOCUMENT_S3_ACCESS_KEY_ID` | S3/R2 access key | Required when `DOCUMENT_STORAGE_PROVIDER=s3`. |
| `DOCUMENT_S3_SECRET_ACCESS_KEY` | S3/R2 secret key | Required when `DOCUMENT_STORAGE_PROVIDER=s3`. |

## Email, Cron, And Notifications

| Key | Purpose | Production rule |
| --- | --- | --- |
| `EMAIL_PROVIDER` | `disabled`, `console`, `resend`, or `webhook` | `console` is allowed but warns in production. |
| `EMAIL_FROM` | Sender address | Warns when email is enabled and not set. |
| `RESEND_API_KEY` | Resend API key | Required when `EMAIL_PROVIDER=resend`. |
| `EMAIL_WEBHOOK_URL` | Outbound email webhook endpoint | Required when `EMAIL_PROVIDER=webhook`. |
| `CRON_SECRET` | Bearer token for cron routes | Warning on Hobby/demo builds, hard failure when `VERCEL_STRICT_ENV=1` or `REQUIRE_CRON_SECRET=true`. |
| `EMAIL_QUEUE_BATCH_SIZE` | Queue batch size | Must be 1-200. |
| `EMAIL_MAX_ATTEMPTS` | Retry count | Must be a positive number. |

## Payments

| Key | Purpose | Production rule |
| --- | --- | --- |
| `NEXT_PUBLIC_STRIPE_ENABLED` | Public UI flag for Stripe payments | Keep false until Stripe keys and webhook are configured. |
| `STRIPE_SECRET_KEY` | Stripe server key | When set, `STRIPE_WEBHOOK_SECRET` and `APP_URL` should also be set. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret | Required once Stripe payments are enabled. |

## Strict Mode

Set one of these to force missing cron protection to fail the Vercel build:

```env
VERCEL_STRICT_ENV=1
REQUIRE_CRON_SECRET=true
```

## Release Gates

- `src/lib/env.ts` provides runtime warnings and hard failures.
- `scripts/verify-vercel.ts` checks Vercel build/deployment compatibility.
- `scripts/verify-environment-contract.ts` checks documentation, `.env.example`, and release-gate wiring.
- `docs/VERCEL_DEPLOYMENT.md` is the operator-facing checklist.

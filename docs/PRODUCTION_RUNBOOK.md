# Production Runbook

This runbook is the first-live-release operating checklist for HomeBase MLS.

## Pre-Deployment

Run these checks before promoting a release:

- `npm run lockfile:verify`
- `npm run clean-install:verify`
- `npm run first-release:verify`
- `npm run permission-matrix:verify`
- `npm run authorization-runtime:verify`
- `npm run protected-routes:verify`
- `npm run environment-contract:verify`
- `npm run marketplace-readiness-messaging:verify`
- `npm run canonical-conversations-workflow-proof:verify`
- `npm run field-workflow-proof-launch-hardening:verify`
- `npm run final-readiness:verify`
- `npm run routes:check`
- `npm run typecheck`
- `npm run build`

Vercel deployments run the critical static release gates through `npm run vercel-build`.

## Environment

Confirm these are configured in production:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `APP_URL`
- `DOCUMENT_STORAGE_PROVIDER`
- S3/R2 document storage variables when using object storage
- Email provider variables
- Stripe keys and webhook secrets if payments are enabled
- `CRON_SECRET` for scheduled work

Do not expose raw secret values in admin screens, logs, browser responses, or support screenshots.

## Seed And Sample Data Safety

`npm run seed` is intended for local and staging workflow proof. In production, the seed script refuses to run unless:

```bash
ALLOW_SAMPLE_DATA_IN_PRODUCTION=true
```

Only set this for a deliberate demo or sandbox production environment. Do not enable it for a real tenant, applicant, or landlord launch.

Sample-data download remains admin/super-user controlled through system tools. Destructive sample cleanup should only be enabled when records are safely tagged.

## Deployment

1. Confirm environment variables match `docs/ENVIRONMENT_CONTRACT.md`.
2. Confirm migrations are committed and `npm run migrations:check` passes.
3. Deploy through Vercel.
4. Confirm `/admin/system`, `/admin`, `/admin/workflow-proof`, `/marketplace`, `/landlord`, `/tenant`, `/vendor`, and `/inspector` load for authorized users.
5. Run a smoke test for marketplace search, application submit, landlord inbox reply, maintenance request, vendor job update, and inspection report flow.

## Rollback

1. Use Vercel rollback to restore the last known good deployment.
2. Do not roll back database schema blindly after migrations.
3. If data migration is involved, freeze writes for the affected workflow, export a database snapshot, and apply a reviewed repair script.
4. Record the incident in admin operations notes or audit logs.

## Incident Response

For security or data exposure concerns:

- Disable affected route or action if needed.
- Revoke affected sessions.
- Review recent audit/security events.
- Check guessed-ID and permission helper coverage.
- Notify affected users according to policy and legal requirements.

For integration failures:

- Check webhook logs and idempotency records.
- Check email queue, Stripe event status, document storage, and cron logs.
- Retry only idempotent jobs.

## Backup And Recovery

- Use `/admin/backups` for JSON exports and manifest review.
- Keep database-level backups with the production database provider.
- Test restore in a non-production environment before declaring recovery complete.

## Final Browser QA

Before inviting real users, verify these pages on desktop and mobile:

- `/`
- `/marketplace`
- listing detail
- guided apply flow
- `/applicant`
- `/tenant`
- `/tenant/maintenance`
- `/landlord`
- `/landlord/inbox`
- `/landlord/tenants`
- `/landlord/maintenance`
- `/vendor`
- `/vendor/jobs`
- `/inspector`
- `/admin`
- `/admin/system`
- `/admin/workflow-proof`

Check keyboard focus, readable contrast, no horizontal overflow, useful loading/empty/error states, and no raw `null` or `undefined` text.

## Performance And Index Review

The Prisma schema includes indexes for the first-release high-traffic paths: user sessions, properties, units, applications, messages, canonical conversations, maintenance requests, inspections, vendor work logs, invoices, ledgers, tasks, audit logs, and integrations.

Before large imports or high-traffic launch, review query plans for:

- marketplace search filters
- landlord tenant directory
- unified inbox
- maintenance queues
- admin command-center drilldowns
- reporting and ledger pages

Add targeted composite indexes only after real query plans show pressure.

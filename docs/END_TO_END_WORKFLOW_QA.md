# End-to-End Workflow QA Release

HomeBase v4.18.0 adds a practical workflow QA layer for the daily paths that prove the platform is more than a set of isolated modules.

## What This Covers

- Public discovery: marketplace listing visibility and inquiry creation.
- Applicant packet: dashboard, renter profile, application detail, document requests, lease packet, ledger, payments, and home tools.
- Landlord operations: dashboard, rental list, rental creation, occupied unit profile, applications, leases, ledger, maintenance, tasks, inbox, and Stripe setup surfaces.
- Maintenance loop: applicant submits a request, the request remains visible to the tenant, and the landlord queue sees the same request.
- Messaging loop: applicant and landlord inboxes expose seeded maintenance conversation context.
- Admin governance: users/access, operations, import/export, reports, notifications, and security routes render without application errors.

## Seed Data Contract

The seeded QA dataset now includes:

- `seed-unit-102-tenant`: occupied rental assigned to the seeded applicant.
- `seed-maintenance-leak-102`: active maintenance request tied to the occupied unit.
- `seed-thread-maintenance-102`: maintenance message thread.
- `seed-message-maintenance-102`: applicant message inside the thread.
- `seed-task-maintenance-102`: operations task tied to the maintenance request.

These records make end-to-end tests deterministic without relying on old customer data or legacy compatibility.

## Commands

```bash
npm run workflow-qa:verify
npm run test:e2e:smoke -- --project=chromium
npm run test:e2e:workflow -- --project=chromium
```

`npm run verify` includes the static workflow QA verifier. CI also runs the workflow Playwright matrix after migrations, seed, unit tests, typecheck, and build.

## Notes

The workflow suite intentionally checks for framework/runtime failure text such as Prisma initialization errors and Next.js application errors. A page that technically returns HTML but renders an application crash should fail the suite.

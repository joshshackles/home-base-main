# Workflow Verification Guide

HomeBase MLS v2.6.0 adds repeatable smoke checks that help catch broken setup, missing seed records, route regressions, storage problems, and common workflow failures.

## Main verification command

```bash
npm run verify
```

This runs preflight checks, route inventory checks, storage verification, seed-data verification, workflow verification, security/static checks, and TypeScript type checking.

## Database-backed checks

The following scripts expect the database to be migrated and seeded first:

```bash
npm run db:setup
npm run seed:verify
npm run workflow:verify
```

`seed:verify` confirms that the sample admin, landlord, applicant, property, unit, lead, application, document requests, lease packet, signatures, inspection, ledger entries, recurring schedule, and payment plan exist.

`workflow:verify` confirms basic scoped-access assumptions and cross-module relationships, including landlord ownership scope, applicant application scope, document requests, leases, inspections, ledger balances, recurring-charge duplicate keys, and signature notification counts.

## Storage checks

```bash
npm run storage:verify
```

This writes, reads, and removes a temporary file in the configured protected document storage directory.

## Security/static checks

```bash
npm run security:verify
```

This confirms important hardening markers are still present, including database-backed role checks, CSV formula protection, protected storage helpers, upload-size alignment, recurring-charge uniqueness, and financial voiding behavior.

## Suggested release order

For a clean local release check, use:

```bash
npm install
npm run db:setup
npm run verify
npm run build
npm run dev
```

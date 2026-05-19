# Update 11 — Automated Tests and Observability

This update adds a regression-test foundation and structured application logging.

## Added

- `vitest` test runner configuration
- Unit tests for password policy and hashing
- Unit tests for email queue configuration
- Unit tests for environment warnings
- Unit tests for logger redaction and log-level filtering
- Structured JSON logger at `src/lib/logger.ts`
- Structured logging for audit-log failures
- Structured logging for security-event failures
- Structured logging for rate-limit failures
- Structured logging for Turnstile verification failures
- Structured logging for queued signature notification delivery
- Static observability verification script

## New scripts

```bash
npm run test
npm run test:watch
npm run observability:verify
```

The main verification chain now includes:

```bash
npm run verify
```

which runs the existing smoke checks, observability verification, unit tests, and TypeScript checks.

## Logging

The new logger emits one JSON object per line with:

- timestamp
- level
- app name
- message
- structured context
- normalized error payload

Sensitive keys are redacted automatically when their names include:

- password
- token
- secret
- authorization
- cookie
- session

## Environment

Optional:

```env
LOG_LEVEL=debug
```

Allowed values:

```txt
debug
info
warn
error
```

Production defaults to `info`; non-production defaults to `debug`.

## Notes

This is intentionally a foundation update. It does not add browser E2E tests yet. The next recommended testing additions are:

- Playwright smoke tests for login and dashboards
- server-action integration tests
- document upload/download integration tests
- lease-signing workflow integration tests

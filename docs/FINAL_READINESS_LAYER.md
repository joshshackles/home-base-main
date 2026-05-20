# Final Readiness Layer

HomeBase MLS v4.59.0 adds the final launch-readiness layer across accessibility, state handling, production documentation, seed safety, performance review, and browser QA expectations.

## Accessibility

- Shared `StatusBadge` now exposes status text through an aria label.
- Shared `EmptyState` announces empty states politely with `role="status"` and `aria-live="polite"`.
- Shared `LoadingState` uses `aria-busy` and a clear live region.
- Shared `ErrorState` uses `role="alert"` and supports a safe retry link.
- Shared action buttons, page-header actions, first-run checklist actions, and system tabs include stronger focus-visible outlines.
- Shared tabs use `aria-current="page"` for the active tab.

## Loading And Error States

The shared UI system now has reusable launch-ready primitives:

- `LoadingState`
- `ErrorState`
- `EmptyState`
- `StatusBadge`
- `ProductPageHeader`
- `SystemTabs`

New feature work should use these primitives instead of one-off loading text, raw errors, or blank empty panels.

## Seed And Sample Safety

The seed script refuses to run in production unless the operator explicitly sets:

```bash
ALLOW_SAMPLE_DATA_IN_PRODUCTION=true
```

This prevents accidental demo data creation in a real launch environment while keeping local and staging workflow proof easy.

## Production Runbook

`docs/PRODUCTION_RUNBOOK.md` now covers:

- pre-deployment gates
- environment checks
- seed/sample data safety
- deployment
- rollback
- incident response
- backup and recovery
- final browser QA
- performance and index review

## Performance And Index Review

The first-release Prisma schema already includes broad indexes for core operational flows. The final readiness guidance is to avoid speculative index churn and instead review query plans for:

- marketplace search
- landlord tenant directory
- unified inbox
- maintenance queues
- admin command-center drilldowns
- reporting and ledger pages

## Final Browser QA

The runbook lists the core public, renter, tenant, landlord, vendor, inspector, and admin routes that should be checked on desktop and mobile before inviting real users.

Because local `npm` may not be present in every Codex desktop shell, browser QA should be completed in an environment that can run `npm run dev` or against the Vercel preview deployment.

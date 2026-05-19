# Workflow Readiness Center

HomeBase v4.19.0 adds an admin-facing workflow readiness layer at `/admin/workflows`.

The goal is to answer the product question that matters most now that the platform is feature rich:

```txt
Can a real user complete the daily workflow, and how mature is that workflow?
```

## Readiness Categories

- `PROVEN`: deterministic seed data plus E2E or static verification coverage.
- `COVERED`: usable workflow with meaningful coverage, but scenario depth or UX polish still needs work.
- `BASIC`: the module exists, but the day-to-day loop is still thin.
- `UNDERDEVELOPED`: the area should not be treated as operationally mature yet.

## Tracked Workflows

- Public discovery to inquiry.
- Applicant housing packet.
- Landlord rental operations.
- Tenant maintenance loop.
- Messaging and universal inbox.
- Lease and e-signature.
- Financial operations and Stripe.
- Admin governance and data operations.
- Vendor and maintenance ecosystem.
- Mobile field work.

## Why This Exists

The previous release added the workflow QA matrix. This release turns that idea into an admin product surface so release planning can be driven by workflow maturity instead of feature count.

Every future major update should move at least one workflow from underdeveloped to basic, basic to covered, or covered to proven.

## Verification

```bash
npm run workflow-readiness:verify
npm run test:e2e:workflow -- --project=chromium
```

The static verifier checks the registry, admin route, navigation, operations link, E2E route coverage, docs, changelog, and package scripts.

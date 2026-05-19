# Unified Rental Lifecycle Engine

HomeBase v4.20.0 adds a single lifecycle engine for rental operations.

The goal is to stop treating rental state as disconnected fields such as unit status, tenant assignment, application status, lease status, notices, maintenance, and occupancy history. The engine translates those signals into one operational lifecycle.

## Lifecycle Lanes

- `Setup`: draft and coming soon.
- `Market`: active listing and lead activity.
- `Lease`: application pending, lease pending, and move-in scheduled.
- `Resident`: occupied and renewal pending.
- `Exit`: notice given and turnover.
- `Hold`: maintenance hold and archived.

## What The Engine Uses

- Unit status and stored lifecycle status.
- Tenant assignment.
- Lead count.
- Application statuses.
- Lease packet statuses.
- Occupancy statuses.
- Formal notice statuses.
- Open maintenance requests.
- Listing photo/detail readiness.

## New Surfaces

- `/landlord/lifecycle`: landlord portfolio lifecycle board.
- `/admin/lifecycle`: platform-wide lifecycle board.
- Landlord rental cards now show lifecycle recommendation and confidence.
- Landlord unit detail now includes a lifecycle recommendation panel and manual lifecycle override.

## Why This Matters

This makes the rental workflow understandable from end to end:

```txt
Draft -> Coming soon -> Active -> Lead activity -> Application pending
-> Lease pending -> Move-in scheduled -> Occupied -> Renewal pending
-> Notice given -> Turnover -> Active again
```

The same lifecycle vocabulary can now drive dashboards, next-best actions, reports, QA, and future automations.

## Verification

```bash
npm run rental-lifecycle:verify
npm run test:e2e:workflow -- --project=chromium
```

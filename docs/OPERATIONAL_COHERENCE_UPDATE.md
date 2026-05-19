# Operational Coherence Update

HomeBase is now feature-rich enough that the primary product risk is navigation and workflow fragmentation. v4.16.0 introduces the first coherence layer: every dashboard and inbox should answer the same operational questions.

## Core Questions

1. What needs action right now?
2. Who is waiting on me?
3. Where is the source-of-truth record?
4. What money is owed, paid, failed, or ready?
5. What changed since last time?

## What Changed

- Added `src/lib/dashboard/coherence.ts` as the shared dashboard coherence DTO and builder.
- Added an operating cockpit to `WorkhorseDashboard` so admin, landlord, and applicant dashboards share the same mental model.
- Added next-best-action framing above dashboard metrics and module grids.
- Made the messaging inbox workspace-aware so admin, landlord, and applicant inboxes link back to the right workflow pages.
- Added rental-record links from message threads when a unit/rental is available.
- Added `scripts/verify-operational-coherence.ts` and wired it into Vercel and full verification.

## Design Rule

New modules should plug into the cockpit by contributing:

- A task for the action queue.
- A tool entry for the module grid.
- A metric for the dashboard strip when useful.
- A related record link for any conversation or timeline event.

Do not add isolated dashboard panels unless they help answer one of the five core questions.

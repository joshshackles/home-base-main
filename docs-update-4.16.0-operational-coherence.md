# v4.16.0 Operational Coherence

This update turns the next roadmap step into code: HomeBase should feel like one obvious operating system, not a collection of unrelated modules.

## Changed

- Added a shared dashboard coherence layer at `src/lib/dashboard/coherence.ts`.
- Added the five-question operating cockpit to the Workhorse dashboard.
- Surfaced next-best action guidance before module grids.
- Made messaging context links workspace-aware for admin, landlord, and applicant users.
- Added rental-record links to message threads when a rental is attached.
- Added `npm run operational-coherence:verify` and wired it into Vercel builds.

## Verification

- `node scripts/verify-operational-coherence.ts`
- `node scripts/verify-clean-install.ts`
- `node scripts/verify-vercel.ts`
- `node scripts/verify-package-cleanliness.mjs`

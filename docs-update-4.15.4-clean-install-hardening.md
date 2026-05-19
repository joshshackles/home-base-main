# v4.15.4 Clean Install Hardening

This package assumes a fresh database and no legacy platform install.

## Changed

- Removed the legacy Vercel migration recovery flow and the no-op compatibility migration.
- Added `npm run clean-install:verify` and wired it into Vercel build commands.
- Tightened migration checks so legacy recovery folders cannot re-enter a clean-install package.
- Updated Vercel documentation to require exact `DATABASE_URL` and `DIRECT_URL` variables.
- Marked database-backed notices and contacts pages as force-dynamic for Vercel-safe rendering.
- Cleaned remaining visible separator encoding artifacts and hardened dashboard polish verification.

## Verification

- `node scripts/verify-vercel.ts`
- `node scripts/check-migrations.ts`
- `node scripts/verify-clean-install.ts`
- `node scripts/verify-dashboard-polish.ts`
- `node scripts/verify-package-cleanliness.mjs`

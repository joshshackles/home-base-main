# Update 4.17.0 — Clean Foundation Release

This release turns the v4.16 operationally coherent platform into a cleaner deployment foundation.

## What changed

- Added `package-lock.json` so Vercel and local installs resolve the same dependency tree.
- Squashed the development migration chain into one baseline migration at `prisma/migrations/20260518000000_squashed_operational_foundation`.
- Removed `prisma migrate deploy` from the Vercel build script. Production migrations now run only through `npm run db:deploy` as an explicit release step.
- Hardened renter payment-method ownership checks before scheduling payments, enabling autopay, and processing saved scheduled payments.
- Finished the dashboard mobile drawer and Cmd/Ctrl-K command palette with keyboard escape behavior and mobile navigation close handling.
- Hardened multi-photo upload filtering so blank file placeholders are ignored consistently and existing max-photo protections remain centralized.
- Added Playwright smoke coverage for signup, access approval, landlord listing/photo controls, tenant assignment, messaging, Stripe payment setup, mobile drawer, and command palette.

## Release flow

1. Install with `npm ci`.
2. Generate Prisma client with `npm run prisma:generate`.
3. Apply database migrations explicitly with `npm run db:deploy`.
4. Deploy to Vercel, where `npm run vercel-build` now generates Prisma and builds Next without mutating the database.
5. Run smoke coverage with `npm run test:e2e:smoke` against a seeded environment.

## Notes

The local sandbox could not complete `prisma generate` because Prisma engine downloads were unavailable from `binaries.prisma.sh`. Migration inventory and route checks were run successfully in this package.

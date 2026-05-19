# Update 9 — Session Correctness and Verified User Access

This update removes stale-cookie trust from sensitive user display and document access paths.

## What changed

- Added `getVerifiedCurrentUser()` in `src/lib/auth.ts`.
- The helper still reads the signed session cookie, but then re-checks the user record in the database.
- Inactive users are treated as logged out immediately.
- Role changes now take effect on the next request instead of waiting for the session cookie to expire.
- Password-reset enforcement remains centralized in `requireUser()`.

## Hardened paths

### Document downloads

`src/app/api/documents/[id]/route.ts` now uses the DB-verified user helper before checking document visibility.

This prevents a deactivated or role-changed user from downloading documents with stale role data from an old cookie.

### App header

`src/components/AppHeader.tsx` now uses the DB-verified user helper before showing admin, landlord, applicant, or account navigation.

This prevents stale admin/applicant/landlord links from showing after account changes.

### Logout auditing

`src/app/login/actions.ts` now uses the DB-verified user helper before writing logout audit/security events.

This avoids recording logout events for deactivated or invalid users based only on stale cookie data.

## Files changed

- `src/lib/auth.ts`
- `src/app/api/documents/[id]/route.ts`
- `src/components/AppHeader.tsx`
- `src/app/login/actions.ts`
- `scripts/verify-session-correctness.ts`
- `package.json`

## Verification

Run:

```bash
npm run session:verify
```

Or as part of the smoke suite:

```bash
npm run qa:smoke
```


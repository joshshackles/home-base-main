# Marketplace Readiness and Unified Messaging Canonicalization

v4.56.0 tightens the public rental marketplace for production use and removes the last competing landlord inbox adapter.

## Marketplace Readiness

- Public marketplace search now uses stronger listing quality gates: active rentals must have real pricing, valid bed/bath values, and at least one usable marketplace detail such as headline, highlights, description, or photos.
- Public search no longer searches exact street address text. Renters can search by city, ZIP, neighborhood, school, property name, amenities, availability, rent, and bedroom/bath needs.
- Listing cards and listing detail pages use privacy-aware area labels through `getPublicLocationLabel` instead of exposing street address as the default public location.
- Map-preview mode remains intentionally area-based. It groups listings by city, ZIP, and neighborhood without fake coordinates or street-level disclosure.
- No-results recovery now exposes removable active filter chips, broader live matches, and save-search recovery without fake listings.
- Saved search management now supports user-scoped deletion from applicant favorites.

## Unified Messaging Canonicalization

- `src/lib/messaging/unified-landlord-inbox.ts` is the canonical landlord communication adapter.
- `src/lib/messaging/landlord-unified-inbox.ts` is now only a compatibility facade that re-exports the canonical adapter.
- Lead, application, tenant, lease, maintenance, and general message sources keep flowing through the permission-scoped unified thread shape used by `/landlord/inbox`.

## Verification

The `marketplace-readiness-messaging:verify` script checks:

- version/package/release metadata,
- privacy-aware marketplace helpers,
- public listing quality gates,
- saved search deletion,
- no-results recovery chips,
- map-preview privacy copy,
- canonical messaging facade,
- and release documentation.

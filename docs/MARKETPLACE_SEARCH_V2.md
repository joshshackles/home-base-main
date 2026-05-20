# Marketplace Search v2

Version: 4.41.0

Update 4 upgrades the public rental marketplace into a more serious rental search product.

## What Changed

- Added user-scoped saved marketplace searches with `SavedMarketplaceSearch`.
- Added `Unit.availableOn` and server-side availability filtering.
- Added marketplace filters for available now, available by date, and available after date.
- Added a mobile filter drawer using URL-backed filters.
- Added active filter chips with individual clear links.
- Added a signed-in "Save search" action and guest sign-in prompt.
- Added saved searches to the applicant saved rentals page.
- Upgraded no-results recovery with suggested actions and broader real listing fallbacks.
- Added availability badges to listing cards and listing detail pages.

## Data Model

`SavedMarketplaceSearch` records are tied to a single `User` and store the URL-driven search filters as JSON. They are not global and are not shown to other users.

`Unit.availableOn` is optional. A null value is treated as available now or unknown so older listings are not accidentally hidden.

## URL State

Marketplace filters remain URL-driven:

- `q`
- `city`
- `minRent`
- `maxRent`
- `bedrooms`
- `bathrooms`
- `minSqft`
- `availability`
- `availableBy`
- `rentalType`
- `voucherFriendly`
- `pets`
- `accessibility`
- `utilities`
- `sort`

## No Fake Data

No-results fallback listings are real active marketplace listings. When they do not match every active filter, the page labels them as broader real matches.

# v4.15 Unified Rental Experience

This update completes the user-facing consolidation of Properties and Units into one rental-first workflow.

## What changed

- Property pages remain compatibility redirects only.
- Rentals are the primary navigation item for admin and landlord dashboards.
- Rental detail links now prefer `/admin/rentals/:id` and `/landlord/rentals/:id`, with internal redirects preserving old unit routes.
- Insurance / Compliance forms now use one **Applies to** selector: Portfolio-wide or a specific Rental.
- Document upload forms now use one **Applies to** selector: Portfolio-wide or a specific Rental, while actions still derive `propertyId` internally for existing schema compatibility.
- Task, Calendar, and Notice creation forms now use one rental scope selector and derive the internal property relationship from the selected rental.
- Reports removed the visible property filter and now focus on Portfolio-wide or a specific Rental.

## Compatibility approach

The database still keeps `Property` and `Unit` for now. The UI treats `Unit` as the rentable home and derives `propertyId` behind the scenes whenever a rental is selected. This avoids a risky migration while removing the confusing two-tab/two-selector experience.

## Remaining future cleanup

- Rename internal route folders from `units` to `rentals` once all links are stable.
- Consider a future schema migration from `Property + Unit` to `Rental + optional RentalGroup`.
- Continue replacing low-level table headers that say `Unit` with `Rental` across legacy admin accounting views.

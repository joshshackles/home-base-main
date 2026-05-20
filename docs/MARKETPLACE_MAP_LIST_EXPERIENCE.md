# Marketplace Map/List Experience

Version: 4.42.0

Update 5 adds a Zillow-style discovery layer to the marketplace using the strongest location experience supported by the current data model.

## Implementation Choice

The current schema has public address, city, state, ZIP, and neighborhood fields, but no latitude/longitude fields and no map provider dependency. Because of that, this update implements a polished **map-preview mode** instead of pretending to render exact interactive map markers.

## What Changed

- Added a `view` mode toggle for `Map preview` and `List`.
- Added a sticky desktop location preview panel beside the listing results.
- Added a mobile location preview drawer above results.
- Grouped real filtered listings by city, ZIP, and neighborhood.
- Added area count bubbles, area cards, and sample listing preview cards.
- Preserved Marketplace Search v2 filters, sort, saved search, availability, active chips, and no-results recovery.
- Added future-map guidance directly in the preview panel so the product path is clear.

## Privacy

This update does not expose any new exact location data. It only uses the same public listing address/city/ZIP fields already shown by the marketplace. It does not invent coordinates.

## Future Full Map Steps

To upgrade this preview into a full interactive map:

1. Add geocoded latitude/longitude fields to public listing records.
2. Add address visibility controls for exact, approximate, and hidden locations.
3. Backfill coordinates with an audited geocoding job.
4. Add a client-only map provider such as Leaflet or MapLibre.
5. Render markers only when privacy settings allow it.

## No Fake Data

All area groups and preview cards are generated from real filtered marketplace listings. If there are no listings, the panel shows a clear empty state.

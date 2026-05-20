# Mobile Flow QA & Admin Command Center Drilldowns

HomeBase MLS v4.54.0 focuses on making real workflows work better on phones and turning command-center alert cards into focused admin drilldowns.

## Phone-First Flow Updates

- Marketplace detail pages use shorter mobile hero media, better contact scroll positioning, and a bottom contact action that jumps directly to the apply/inquiry panel.
- Guided apply uses smaller mobile padding, tighter hero typography, and a full-width minimum-height submit action.
- Landlord inbox now behaves like a mobile inbox: thread list first, tap a thread, then open the conversation view with a back link.
- Tenant directory cards use mobile-safe padding, two-column signal cards, and wrapping names instead of desktop-only text blocks.
- Maintenance and vendor jobs use tighter mobile containers, two-column metrics where useful, and larger tap targets for field updates.
- Admin command center headers, metric panels, action shortcuts, and audit tables are safer on narrow screens.

## Admin Command Center Drilldowns

The admin command center now links issue cards to `/admin/command-center/drilldowns?key=...`. Each drilldown shows a focused list of real records, source-area links, status badges, and mobile-safe record cards.

Connected drilldowns include data quality, failed integrations, blocked workflows, stale maintenance, unresolved inspections, old access requests, missing photos, missing marketing details, zero-rent units, orphaned context, failed queue jobs, and pending application/lease workflows.

## Verification

`mobile-flow-drilldowns:verify` checks route wiring, command-center drilldown helpers, mobile layout markers, release gate wiring, and version metadata.

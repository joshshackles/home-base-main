# Admin Operations Authority & Marketplace Discovery Polish

HomeBase MLS v4.55.0 makes admin operations feel less scattered and improves renter marketplace discovery for production use.

## Admin Operations Authority

- `/admin` remains the canonical command center for normal admin visibility.
- `/admin/command-center` remains the super-user protected command-center view.
- Admin navigation now points primary operations work into command-center anchors for access requests, data quality, workflows, integrations, health, sample data, security, and audit logs.
- The command center includes an authoritative operations directory so admins can start from one page, triage counts, then open focused drilldowns or source tools.
- Section anchors include `#access-requests`, `#data-quality`, `#blocked-workflows`, `#failed-integrations`, `#production-health`, `#sample-data`, `#security`, and `#audit-logs`.

## Marketplace Production Discovery Polish

- The public marketplace top search now supports availability dates directly, not only inside secondary filters.
- The marketplace adds quick discovery cards for voucher-friendly homes, pet notes, utilities noted, available-now listings, lowest-rent sorting, and a top active city.
- Saved search labels now link renters back toward their saved-homes workflow instead of sitting as inert labels.
- A production trust strip explains real-listing behavior, shareable search URLs, and reusable packet fast-apply readiness.

## Verification

`admin-ops-marketplace-discovery:verify` checks the admin consolidation markers, marketplace production discovery markers, version metadata, and release-gate wiring.

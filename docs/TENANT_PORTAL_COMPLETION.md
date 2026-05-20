# Tenant Portal Completion

HomeBase MLS v4.53.0 finishes the resident-facing tenant portal so tenants no longer land in applicant-era routes for active-resident workflows.

## Native Tenant Routes

These routes now render tenant-native pages with resident language, tenant role guards, and `/tenant` links:

- `/tenant/lease`
- `/tenant/leases`
- `/tenant/leases/[id]`
- `/tenant/payments`
- `/tenant/ledger`
- `/tenant/maintenance`
- `/tenant/inbox`
- `/tenant/documents`
- `/tenant/notices`
- `/tenant/inspections`
- `/tenant/tasks`
- `/tenant/calendar`
- `/tenant/notifications`

## No Applicant Redirects

The first-release tenant workflow should feel like a resident portal, not a reused applicant dashboard. The native tenant pages may reuse trusted backend actions or data helpers where that keeps behavior consistent, but the user-facing route, copy, navigation, and next actions stay in the tenant portal.

## Resident Workflow Coverage

- Lease and lease packet review live under `/tenant/lease` and `/tenant/leases`.
- Rent, payment setup, scheduled payments, recovery plans, and ledger activity live under `/tenant/payments` and `/tenant/ledger`.
- Maintenance requests and maintenance conversation context live under `/tenant/maintenance`.
- Messages across applications and active-resident maintenance threads live under `/tenant/inbox`.
- Resident documents, formal notices, and inspections live under `/tenant/documents`, `/tenant/notices`, and `/tenant/inspections`.
- Resident tasks, calendar items, and notification preferences live under `/tenant/tasks`, `/tenant/calendar`, and `/tenant/notifications`.

## Verification

`tenant-portal:verify` checks that the native tenant routes are tenant-guarded, avoid applicant redirects, use tenant document/notice routing, and remain wired into local and Vercel release gates.

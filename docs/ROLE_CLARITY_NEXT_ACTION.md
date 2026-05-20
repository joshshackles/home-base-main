# Role Clarity Next Action System

Version: 4.38.0

## Purpose

This update addresses the broad-product-surface problem by making the shared role dashboard answer three questions immediately:

- What kind of account am I using?
- What is this role trying to accomplish?
- What should I do next?

## Implemented

- Added `RoleDashboardClarity` to `src/lib/dashboard/role-dashboard.ts`.
- Added role-specific goal and focus copy for applicant, tenant, landlord, inspector, vendor, and admin modules.
- Derived the primary next action from urgent needs-attention items first, then ordinary attention items, then the role empty state.
- Added follow-up actions from the needs-attention queue and authorized tools.
- Added a prominent "You are here" panel and "Do this next" panel to `src/components/dashboard/RoleDashboard.tsx`.
- Surfaced authorized dashboard modules directly in the clarity panel.

## Data Behavior

The next action system does not create fake work. It uses:

- Existing needs-attention records from the dashboard builder.
- Existing empty-state destinations when no work is waiting.
- Existing tools already authorized through role and approved account access.

## Role Coverage

- Applicant: renter journey, profile/application readiness, saved homes, messages, and documents.
- Tenant: resident operations, rent, lease, maintenance, notices, inspections, documents, and messages.
- Landlord: portfolio command center, messages, applications, vacancies, listings, leases, repairs, tenants, and reports.
- Inspector: assigned inspections, reports due, failed inspections, and reinspection work.
- Vendor: assigned jobs, acceptance, SLA risk, invoices, payouts, and field updates.
- Admin: platform control room, access requests, workflow health, security, data quality, reports, and operations.

## Follow-up Work

This is the first of the eight planned enterprise UX updates. It improves the shared role dashboard immediately. Later updates should bring the same clarity pattern into dedicated module pages such as `/applicant`, `/tenant`, `/landlord`, `/vendor`, and `/admin`.

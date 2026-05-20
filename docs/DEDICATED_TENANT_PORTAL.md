# Dedicated Tenant Portal

Version: 4.39.0

Update 2 creates a first-class `/tenant` portal so residents no longer have to interpret the applicant dashboard as their home base after move-in.

## What Changed

- Added a protected `/tenant` route that renders the tenant-specific role dashboard.
- Added a resident-focused dashboard shell with rent, lease, maintenance, notices, inspections, documents, messages, and calendar navigation.
- Moved tenant dashboard home and tenant action links from `/applicant` to `/tenant`.
- Added protected tenant workflow URLs that currently redirect into the existing resident-capable applicant workflow screens.
- Preserved server-side role protection with `requireRole(["TENANT"], "/tenant")`.

## Resident Mental Model

Tenants now land in a portal labeled "Tenant portal" and "Resident operations." The navigation uses resident language for the work they actually need after move-in:

- Rent and ledger
- Lease packets
- Maintenance requests
- Notices
- Inspections
- Documents
- Messages and notifications

## No Fake Data

The tenant dashboard still uses the existing occupancy, payment, maintenance, message, inspection, notice, and document queries. This update only changes the portal structure and workflow entry points; it does not introduce fake tenant metrics or placeholder records.

## Follow-Up Work

The redirect routes intentionally preserve existing working resident workflows. Future updates can replace each redirect with native tenant pages one at a time without changing the visible `/tenant/...` URL contract.

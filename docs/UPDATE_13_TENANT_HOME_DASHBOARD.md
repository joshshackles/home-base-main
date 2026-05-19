# Update 13 — Tenant Home Dashboard

## Goal

The applicant area now adapts once a user becomes a tenant. If a user has an active assigned rental, `/applicant` becomes a tenant-first home dashboard instead of a search/application dashboard.

## What changed

- Keeps the existing applicant/search dashboard for users without an assigned rental.
- Detects tenant mode using `Unit.tenantUserId`.
- Adds a tenant dashboard above the fold with:
  - current rental address and rental type
  - lease/rent snapshot
  - next payment and pay-rent action
  - recent payments
  - upcoming/open payments
  - open maintenance requests
  - inline quick maintenance request form
  - upcoming inspections and calendar events
  - notices/signature/task attention counters
  - recent documents and active lease information
- Adds clear quick actions for:
  - Pay rent
  - Request maintenance
  - Message landlord/staff
  - View calendar
  - View documents
  - View lease center

## Design intent

Tenants should not have to hunt through the sidebar to find the most important daily information. The first screen now answers:

1. Where do I live in the system?
2. What do I owe next?
3. What did I recently pay?
4. Is maintenance open?
5. Is anything scheduled?
6. Is anything waiting on me?
7. Where do I click to act?

## Compatibility

This update does not remove the existing applicant workflow. It branches the dashboard only when the user has at least one current rental assignment.

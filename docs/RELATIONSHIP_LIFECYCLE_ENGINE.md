# v4.14 Relationship Lifecycle Engine

v4.14 moves HomeBase from a role-only applicant/tenant workflow to a relationship lifecycle workflow.

## What changed

- Added `Occupancy` as the durable relationship between a person and a rental.
- Added lifecycle states for active tenants, pending move-ins, renewals, notice, move-out, former tenants, and cancelled occupancies.
- Application approval can now activate a tenant relationship.
- Tenant activation updates the rental assignment, creates a connected-renter profile connection, and switches the renter dashboard into tenant mode.
- The tenant dashboard now reads modern occupancy records first, while still falling back to legacy `Unit.tenantUserId` assignments.

## Conversion behavior

When an application is approved through the lifecycle action:

1. The application status becomes `APPROVED`.
2. The applicant user becomes `TENANT` if their current role is `APPLICANT`.
3. The rental is marked occupied and assigned to the tenant.
4. A `ProfileConnection` is created for the landlord-to-renter relationship.
5. An `Occupancy` record is created or updated.
6. The applicant dashboard switches to the tenant-first “My Home” dashboard.

## Why this matters

A user should not lose their history when they move from applicant to tenant. The same person keeps applications, screenings, documents, messages, payments, maintenance, and lease history while their relationship to a rental changes over time.

# v4.14.1 Relationship Lifecycle Completion

This patch finishes the first end-to-end relationship lifecycle pass.

## Added

- Landlord/admin **End tenancy** controls on application relationship panels.
- `endTenantOccupancy()` lifecycle service that moves an active occupancy to `FORMER`.
- Unit cleanup when a tenancy ends:
  - clears `tenantUserId` compatibility mirror when appropriate
  - moves rental lifecycle to `TURNOVER`
  - marks the rental/unit as `AVAILABLE`
- Connected-renter profile connection revocation when active tenancy ends.
- Application lifecycle notes for move-out/end-tenancy events.
- Audit-log event for ended occupancies.
- Former tenant dashboard mode with access to historical homes, prior payments, documents, notices, and applications.
- Occupancy-aware authorization helpers for unit/document/ledger access.
- Occupancy-aware task, calendar, and notice scopes.

## Lifecycle behavior

Applicant approval still activates tenant access through Occupancy. Ending a tenancy now preserves history instead of deleting the relationship. Former tenants lose active-home actions such as maintenance request access through active occupancy checks, while keeping historical records visible.

## Source of truth

`Occupancy` is now the primary relationship source. `Unit.tenantUserId` remains a compatibility mirror for older payment and rental logic.

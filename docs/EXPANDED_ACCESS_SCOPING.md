# Property Manager & Expanded Access Scoping

HomeBase MLS separates module eligibility from record visibility.

Approved `AccountAccessRequest` records let a user open the right workspace, but they do not by themselves grant access to every landlord portfolio. Record access must also be proven through ownership, unit assignment, participant relationship, or an active role-specific `ProfileConnection`.

## Access Rules

| Actor | Module gate | Record scope |
| --- | --- | --- |
| Landlord owner | `UserRole.LANDLORD` | Own `Property.ownerId` portfolio |
| Property manager | Approved `PROPERTY_MANAGER` or `LANDLORD` access | Active `ProfileConnection` with `PROPERTY_MANAGER`, scoped to `PORTFOLIO` or a unit |
| Caseworker / housing coordinator | Approved `CASEWORKER` access | Active `ProfileConnection` with `CASEWORKER` or `HOUSING_COORDINATOR`, scoped to `PORTFOLIO` or a unit |
| Inspector | `UserRole.INSPECTOR` or approved `INSPECTOR` access | Assigned inspection or active inspector profile connection |
| Maintenance/vendor | Approved `MAINTENANCE` or `VENDOR` access | Assigned maintenance request, assigned unit staff field, or active maintenance/vendor profile connection |
| Applicant/tenant | Applicant/tenant role | Own application, active occupancy, current tenancy, assigned signer, or uploaded/visible document relationship |
| Admin | `UserRole.ADMIN` | Platform-wide, with super-user helpers for sensitive operations |

## Helper Direction

`src/lib/authorization.ts` now includes:

- `isLandlordOwner`
- `canManageOwnerPortfolio`
- role-specific `ProfileConnection` checks
- direct unit staff assignment checks for `propertyManagerUserId`, `caseworkerUserId`, and `maintenanceUserId`
- scoped support checks for housing, maintenance, and inspection records

This keeps a property manager connected to Owner A from seeing Owner B's portfolio just because their account has approved `PROPERTY_MANAGER` module access.

## Test Coverage

`tests/unit/authorization.test.ts` includes multi-owner coverage for:

- property manager access to a connected owner portfolio
- property manager denial for an unrelated owner portfolio
- caseworker access to housing/application context without ledger access
- inspector denial without assignment or scoped connection
- role-specific active profile connections for unit access

## Follow-Up Work

- Move landlord list pages from owner-only Prisma filters to shared scoped `where` helpers so property managers can see connected portfolios in bulk lists.
- Add database-backed integration tests once CI has a seeded test database.
- Add UI labels that explain why a connected staff user can see a given record.

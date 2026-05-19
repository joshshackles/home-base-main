# v4.14.2 Relationship Contact Network

This patch expands the Relationship Lifecycle Engine beyond applicant/tenant conversion and makes it a broader connected-people system.

## Added relationship roles

The `ConnectionRole` enum now supports:

- `PROPERTY_MANAGER`
- `CASEWORKER`
- `HOUSING_COORDINATOR`
- `INSPECTOR`
- `MAINTENANCE_STAFF`
- `MAINTENANCE_WORKER`
- `PREFERRED_VENDOR`
- `VENDOR`
- `EMERGENCY_CONTACT`
- `SUPPORT_CONTACT`
- `CONNECTED_RENTER`

## Landlord contact management

The landlord Contacts page now includes a relationship creation panel. A landlord can connect an existing user as a portfolio-wide or rental-scoped contact.

Useful examples:

- housing coordinator for a tenant
- case worker for a household
- emergency contact
- preferred vendor
- maintenance worker
- property manager
- inspector
- support contact

## User-facing contacts list

Applicants/tenants now have `/applicant/contacts` and vendors have `/vendor/contacts`.

Those pages show people connected through:

- active occupancy
- explicit profile connections
- rental staff assignments
- active maintenance work
- vendor workflows
- landlord ownership

## Design note

`ProfileConnection` is now the explicit relationship table, while occupancy, maintenance, unit staff, vendor profile, and application workflows are treated as relationship sources that can appear in the unified contact list.

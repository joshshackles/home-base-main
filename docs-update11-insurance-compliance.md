# Update 11 — Insurance / Compliance Module

Adds a functional Insurance and Compliance module for admin and landlord dashboards.

## Included

- Renters, landlord, liability, flood, umbrella, and other insurance policy tracking.
- Policy provider, policy number, coverage amount, effective date, expiration date, document URL, and notes.
- Certification tracking for occupancy permits, safety certifications, licenses, and recurring regulatory documents.
- Inspection compliance requirements with frequency, last-completed date, next-due date, and status.
- Admin and landlord-scoped create actions.
- Portfolio access checks for landlord-created records.
- Admin route: `/admin/compliance`.
- Landlord route: `/landlord/compliance`.

## Verification

Run:

```bash
npm run update11:verify
npm run typecheck
```

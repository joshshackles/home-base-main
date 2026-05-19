# Landlord Operating Console

HomeBase v4.23.0 makes the landlord rental detail page the work center for a rental.

## What changed

- Added a top operating console with direct links into listing health, leads and applications, tenant record, lease/rent/deposit, ledger, maintenance, contacts, inspections, documents, notes, and timeline.
- Added listing health scoring for photos, marketing copy, pricing, terms, location context, and support contacts.
- Added a needs-attention queue that surfaces listing gaps, lead activity, requested documents, open repairs, active inspections, and ledger balance.
- Added a pipeline section for lead and application review on the rental page.
- Added inspection and document sections directly to the rental page.
- Added a rental timeline assembled from leads, applications, lease packets, ledger entries, maintenance requests, inspections, and documents.

## Design intent

Landlords should not have to jump between separate module lists to understand one rental. The rental page now answers:

1. Is the listing healthy?
2. Who is interested or applying?
3. Who lives here?
4. What lease, rent, deposit, and ledger state matters?
5. What maintenance, contacts, inspections, documents, notes, and messages are attached?
6. What changed most recently?

## Verification

Run:

```bash
npm run landlord-operating-console:verify
```

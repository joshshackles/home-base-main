# Applicant/Tenant Experience Upgrade

HomeBase v4.22.0 turns `/applicant` into a guided housing journey instead of a generic dashboard.

## Applicant journey

- Profile completeness now tracks identity, household, income, rental goals, references, and renter story.
- Saved searches and favorites are visible as a core housing-search step.
- Documents are framed as a reusable application packet, with requested-document gaps surfaced immediately.
- Applications remain visible as active decision workflows with status and recent activity.
- Move-in readiness links tasks, utilities, planned payments, maintenance preferences, documents, and messages before tenancy begins.

## Tenant journey

- Active tenants now see a move-in checklist progress rail above the existing home dashboard.
- Rent calendar, utilities, maintenance, documents, and messages are promoted into guided journey cards.
- The existing current-rental, payment, maintenance, schedule, attention, and documents sections remain available below the new journey layer.

## Verification

Run:

```bash
npm run applicant-tenant-experience:verify
```

The verifier checks that the dashboard, docs, version metadata, and release markers for the new experience are present.

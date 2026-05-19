# Reporting & Analytics v1

HomeBase v4.26.0 upgrades the reports hub into a real analytics surface with scoped exports and drilldowns for the operating questions landlords and admins ask every week.

## Report families

- Occupancy: property and rental inventory, occupied/available/pending/unavailable counts, and occupancy rate.
- Delinquency: past-due posted charges and adjustments with tenant/applicant, rental, due date, and balance.
- Cash flow: tenant payment inflow, vendor invoice and payout outflow, and net period cash movement.
- Lead conversion: lead status, application linkage, and lead-to-approval conversion.
- Application funnel: started, submitted, under review, approved, denied, and withdrawn application movement.
- Maintenance cost: vendor invoices tied to maintenance work, rentals, status, and spend.
- Vendor performance: active vendors, submitted invoice volume, paid payouts, average invoice, and vendor spend.
- Inspection compliance: inspection outcomes, recurring compliance requirements, due dates, and risk status.

## Exports

Each report section supports the existing export route:

- Admin CSV: `/admin/reports/export?section=vendor_performance&format=csv`
- Admin JSON: `/admin/reports/export?section=vendor_performance&format=json`
- Landlord CSV: `/landlord/reports/export?section=vendor_performance&format=csv`
- Landlord JSON: `/landlord/reports/export?section=vendor_performance&format=json`

Exports use the same date, property, rental, and role scope as the on-screen report. CSV output still runs through the shared spreadsheet-formula neutralizer.

## Drilldowns

Admin and landlord drilldowns render the active report table and link directly to matching CSV/JSON downloads:

- `/admin/reports/drilldown?section=delinquency`
- `/landlord/reports/drilldown?section=inspection_compliance`

The drilldown page is intentionally table-first so it can be audited, filtered, and exported without hidden client-only calculations.

## Filters

Reports support:

- Date range: `from` and `to`
- Property: `propertyId`
- Rental: `rentalId`
- Section: `section`

Landlord reports are scoped to the signed-in landlord's portfolio. Admin reports cover the platform portfolio unless property or rental filters are supplied.

## Verification

Run:

```bash
npm run reporting-analytics-v1:verify
```

The verifier checks report sections, DTO fields, drilldown routes, export wiring, UI actions, docs, and release metadata.

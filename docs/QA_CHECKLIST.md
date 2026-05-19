# HomeBase MLS QA Checklist

Use this checklist before publishing a release or handing the package to someone else for testing.

## Install and build checks

Run these commands from a clean checkout:

```bash
npm install
npm run db:setup
npm run preflight
npm run routes:check
npm run storage:verify
npm run seed:verify
npm run workflow:verify
npm run security:verify
npm run typecheck
npm run build
```

## Login and permission checks

- Admin can log in and reach `/admin`.
- Landlord can log in and reach `/landlord`.
- Applicant can log in and reach `/applicant`.
- Landlord cannot open `/admin`.
- Applicant cannot open `/admin` or `/landlord`.
- Deactivated users cannot log in.
- A user whose role was changed loses access to routes from the prior role after the next request.

## Marketplace and application checks

- Public marketplace loads available, non-archived listings.
- Unit detail page opens from a marketplace card.
- Public interest form creates a lead.
- Admin can convert a lead to an application.
- Applicant can see only their own applications.
- Landlord can see only applications tied to owned properties.

## Document checks

- Admin can request a document from an application.
- Applicant sees missing requested documents.
- Applicant can upload a document against a request.
- Admin can accept or reject the document request.
- Rejected requests remain visible with review notes.
- Protected document download works only for authorized users.

## Lease and signature checks

- Admin can create a lease packet from an approved application.
- Admin can generate a lease PDF.
- Admin can send a lease for signature.
- Applicant can sign the tenant signature request.
- Landlord can sign the landlord signature request.
- Lease completes after all required signatures are signed.
- Final signed lease PDF is generated or can be generated manually.
- Voiding/reissuing a lease preserves the old record and creates a replacement draft.

## Inspection checks

- Admin can schedule an inspection for a unit/application.
- Checklist items can be marked pass, fail, pending, or not applicable.
- Landlord sees inspections only for owned units.
- Applicant sees inspections only for their own applications.

## Ledger checks

- Admin can create charges, payments, credits, and adjustments.
- Voiding a ledger entry removes it from balance calculations.
- Recurring charges do not duplicate for the same schedule/month.
- Payment plan installments marked paid create ledger payments.
- Changing a paid installment away from paid voids the linked ledger payment.
- Applicant and landlord ledger pages show only scoped records.
- CSV exports open cleanly and do not execute spreadsheet formulas.

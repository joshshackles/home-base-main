# Updates 9-12 Operations Modules

This update adds four portfolio operations modules to the Next.js/Prisma HomeBase MLS app.

## Update 9: Applicant Screening Module

Routes:
- `/admin/screening`
- `/landlord/screening`

Data model coverage:
- Screening packages
- Applicant screening orders
- Background/credit/eviction/identity check records
- Income verification
- Rental history verification
- Reference checks

## Update 10: Maintenance Inventory Module

Routes:
- `/admin/inventory`
- `/landlord/inventory`

Data model coverage:
- Appliances
- HVAC and water heater assets
- Keys and locks
- Warranty tracking
- Serial numbers
- Service history
- Maintenance request service linkage

## Update 11: Insurance / Compliance Module

Routes:
- `/admin/compliance`
- `/landlord/compliance`

Data model coverage:
- Renters insurance policies
- Landlord insurance policies
- Certification records
- Inspection compliance requirements
- Expiration and missing-document risk statuses

## Update 12: Integrations Hub

Routes:
- `/admin/integrations`
- `/landlord/integrations`

Data model coverage:
- Stripe
- Plaid
- Twilio
- SendGrid
- Postmark
- S3/R2
- QuickBooks
- Google Calendar
- Google Maps
- Screening providers

## Implementation notes

The modules are backed by Prisma models and a migration in `prisma/migrations/20260518160000_screening_inventory_compliance_integrations`. Dashboard query helpers live in `src/lib/operations/modules.ts`, and the shared dashboard UI is `src/components/operations/OperationsModuleView.tsx`.

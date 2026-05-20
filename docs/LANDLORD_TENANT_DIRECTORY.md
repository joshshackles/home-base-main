# Landlord Tenant Directory

Version: 4.35.0

## Purpose

The landlord Tenant Directory turns `/landlord/tenants` into a marketplace CRM page for the renters and applicants a landlord is allowed to see. It combines authorized applications, marketplace leads, current occupancies, and past tenant records into one searchable work surface.

## Privacy Model

- Directory data is loaded only after `requireRole(["LANDLORD"])`.
- Application, lead, and occupancy queries are scoped through `unit.property.ownerId`.
- Detail pages use prefixed IDs such as `application-{id}`, `lead-{id}`, and `occupancy-{id}` and still re-check landlord ownership on the server.
- Reusable applicant profile, documents, household, income, and application packet details are shown only when the tenant has applied or profile sharing is authorized.
- Lead-only records show the lead contact/question context, with the reusable profile locked until an application or sharing authorization exists.

## Implemented Upgrade

- Added a polished CRM-style directory with summary metrics, search, filters, sorting, pagination, and empty states.
- Added filters for relationship, status, property, unit, listing state, and share authorization.
- Added quick actions for profile review, applications, message threads, and lead replies.
- Added detail views that connect contact details, linked rental, application packet, household, income, documents, messages, and activity context.
- Added locked/private states instead of exposing unavailable reusable profile sections.

## Remaining Follow-Up Opportunities

- Add landlord notes and saved/archived directory views once the product has a dedicated tenant-note model.
- Add invite-to-apply and request-update actions once the notification templates are finalized.
- Add bulk export once tenant directory audit and export permissions are defined.

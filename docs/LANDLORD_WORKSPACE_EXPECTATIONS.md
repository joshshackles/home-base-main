# Landlord Workspace Expectations

HomeBase MLS should feel less like a database and more like an operating system for a rental business. Landlords should not have to click through disconnected pages to answer basic operating questions:

- Who applied?
- Who owes rent?
- Which unit has an open maintenance request?
- Which document is missing?
- What needs attention today?

The product standard is:

> A landlord should be able to see what is happening, understand what needs attention, and edit or act on the relevant information from wherever they encounter it.

This means HomeBase should feel like an operational command center, not a website navigation exercise.

## Core Landlord Expectations

Landlords expect control, clarity, speed, and confidence.

- Control: properties, units, applicants, tenants, leases, documents, payments, maintenance, and messages must be manageable in one place.
- Clarity: every screen should reduce messiness by showing status, ownership, missing items, next actions, and recent history.
- Speed: landlords should be able to perform routine work without opening six separate pages.
- Confidence: the platform should make it obvious what is complete, pending, overdue, risky, or already handled.

Every major landlord screen should answer:

1. What am I looking at?
2. What is the current status?
3. What needs attention?
4. What can I do next?

## Property And Unit Command Centers

The property page should not be a static profile. It should be the main operating workspace for a property.

Expected property data:

- property name and address
- ownership or management status
- unit count
- occupied and vacant units
- pending applications
- rent collected and outstanding
- open maintenance
- document alerts
- compliance status
- recent activity

The unit is the connection point for the most important workflows. A unit can be vacant, listed, under application review, leased, occupied, under maintenance, or unavailable.

Expected unit data:

- occupancy status
- listing status
- rent and deposit
- availability date
- tenant or applicant connection
- lease status
- maintenance status
- photos and documents
- activity history

Expected unit actions:

- edit listing
- review applicants
- assign tenant
- update rent
- upload documents
- add maintenance request
- send message
- view ledger

## Application Review

Application review should be centralized. Landlords should see applicant profile, household details, income, employment, rental history, screening status, documents, notes, messages, and decision actions in one workspace.

Expected statuses:

- New
- In Review
- Missing Information
- Documents Requested
- Screening Pending
- Approved
- Denied
- Withdrawn
- Converted to Tenant

Expected actions:

- request documents
- message applicant
- approve
- deny
- assign to unit
- move to lease workflow

## Tenant Management

The system should not stop after move-in. Tenant workspaces should include:

- contact information
- household members
- lease details
- payment history
- document history
- maintenance history
- communication history
- notes and status

Expected actions:

- edit tenant
- message tenant
- upload document
- add note
- view ledger
- add charge
- issue notice
- renew lease
- start move-out

## Financial Presentation

Financial data should be readable before it is accounting-heavy. Summaries should come before ledgers.

Expected financial data:

- rent collected
- outstanding rent
- late payments
- upcoming charges
- deposits
- credits
- payment history
- tenant balances

Expected statuses:

- Paid
- Unpaid
- Partially Paid
- Late
- Processing
- Failed
- Waived
- Credited
- Refunded

Every financial row should connect to the relevant property, unit, tenant, lease, payment, document, and activity history.

## Maintenance Work Records

A maintenance ticket should become a work record, not just a form submission.

Expected maintenance data:

- issue title
- unit
- tenant
- priority
- status
- date submitted
- assigned staff or vendor
- photos and videos
- notes
- messages
- cost

Expected statuses:

- New
- Needs Review
- Scheduled
- Assigned
- In Progress
- Waiting on Tenant
- Waiting on Vendor
- Completed
- Closed
- Reopened

Maintenance records should support tenant-visible messages and private internal notes.

## Documents And Messages

Documents should not be a generic file dump. They should attach to applicants, tenants, leases, properties, units, maintenance requests, inspections, payments, notices, and owner records.

Document actions should include:

- upload
- request
- preview
- download
- replace
- mark reviewed
- send for signature
- attach to record

Messages should be attached to the workflow being discussed. The global inbox remains useful, but messages also need to appear inside property, unit, application, tenant, lease, and maintenance workspaces.

Every message should answer:

- Who said what?
- When?
- About which record?
- Was it internal or external?
- Is a reply needed?

## Activity And Audit History

Every major record should have visible activity history. This should include:

- created records
- edited fields
- status changes
- document uploads
- messages sent
- notes added
- payments recorded
- maintenance updates
- lease changes
- user actions

History should be visible from the relevant record and should not require admin-only digging.

## Priority Workspace Modules

The first serious landlord operating loop should prioritize:

- Property Workspace
- Unit Management
- Listing and Lead Inbox
- Applicant Review
- Tenant Profile
- Lease Management
- Documents
- Messaging
- Maintenance
- Rent Ledger
- Activity History

These modules form the baseline. Inspections, owner portals, vendor portals, advanced reports, automated alerts, integrations, and accounting exports can build on top.

## Edit Anything From Anywhere

Landlords should not be forced to leave context to fix data they encounter.

Recommended editing patterns:

- Inline editing for small low-risk fields.
- Side drawers for medium edits.
- Full-screen workflows for legal, financial, or high-risk actions.

Examples:

- Edit a tenant phone number from the tenant panel.
- Edit rent from a unit or financial terms panel.
- Open a unit edit drawer from an application review.
- Add a maintenance issue without leaving the unit workspace.
- Request a missing document from the application workspace.

This principle should be permission-aware. The UI can expose edit affordances broadly, but backend services must still enforce who can edit what.

## Three-Zone Workspace Standard

The recommended landlord workspace structure is:

- Left: navigation and switching.
- Center: active workspace.
- Right: contextual information and actions.

Examples:

- Unit workspace: left switches unit workflows, center shows the unit record, right shows messages, documents, notes, alerts, and quick actions.
- Applicant workspace: left shows pipeline stages, center shows the application, right shows documents, messages, decision actions, and notes.
- Maintenance workspace: left shows filters, center shows the ticket or board, right shows tenant communication, private notes, vendor assignment, and photos.

This prevents long scrolling pages and supports the operational canvas architecture.

## Data Presentation Standards

- Status should always be visible.
- Important numbers should be summarized before tables.
- Tables should be used when comparison matters.
- Cards should be used when action matters.
- Timelines should be used when history matters.
- Empty states should guide the user to the next action.
- Buttons should use clear action language.

Preferred button language:

- Request Documents
- Edit Unit
- Message Tenant
- Add Charge
- Review Application
- Assign Vendor

Avoid vague labels like "Manage" when a specific action is known.

## Connected Record Model

HomeBase should compete by making records connected:

- A property connects to units.
- A unit connects to listing, applicants, tenant, lease, maintenance, documents, ledger, and history.
- An applicant converts cleanly into a tenant.
- A maintenance issue connects to unit, tenant, vendor, photos, notes, messages, expense, and activity.
- A document knows what it belongs to.
- A message knows what record it is about.
- A payment connects to tenant, unit, lease, charge, receipt, and ledger.

## Build Philosophy

Before building each landlord module, define:

- What object does this module manage?
- Who is allowed to see it?
- Who is allowed to edit it?
- What statuses does it use?
- What records does it connect to?
- What actions can happen from this module?
- What should the empty state say?
- What should appear in the right context panel?
- What activity history should be recorded?

The shared backend and business logic should own object rules, permissions, statuses, actions, and audit history. Web, mobile, admin, and future app interfaces should render and operate on the same core model.

## North Star

HomeBase should make landlords feel they can:

- See everything clearly.
- Act from anywhere.
- Edit without losing context.
- Keep every record connected.
- Show the next step.
- Preserve the full history.


# Unified Messaging & Lead Inbox

Version: 4.43.0

This update turns `/landlord/inbox` into the landlord communication work center by normalizing existing communication sources into one server-shaped inbox record.

## Unified Sources

- `Lead` and `LeadNote`: marketplace listing questions, landlord email replies, and landlord notes.
- `MessageThread` and `Message`: application, lease, maintenance, and general workflow conversations.
- Application context through `MessageThread.application`.
- Maintenance context through `MessageThread.maintenanceRequest`.
- Property and unit context through each linked application, maintenance request, or lead.

## Architecture

The implementation uses an adapter instead of a destructive data migration:

- `src/lib/messaging/unified-landlord-inbox.ts` builds `UnifiedInboxThread` records from current Prisma models.
- `src/app/landlord/inbox/page.tsx` renders one unified landlord inbox UI.
- Lead replies still use `replyToLandlordLead`.
- Workflow replies still use `sendWorkflowMessage`.

This keeps current message history intact while giving landlords one obvious inbox.

## Permission Model

Inbox data is scoped server-side:

- Leads must belong to a unit owned by the landlord or assigned to them through `propertyManagerUserId`.
- Message threads must be connected to an application, maintenance request, or created thread visible to the signed-in landlord.
- Internal notes continue to follow the existing `visibleMessageWhereForUser` and `visibleThreadWhereForUser` rules.
- A landlord cannot open another landlord's lead or workflow message thread by guessing an ID because the adapter only returns scoped source records, and reply actions keep their existing authorization checks.

## Remaining Follow-Up

- Add a dedicated unified conversation table only if the product needs cross-source archival, assignment, or SLA workflows that cannot be represented by existing models.
- Add a first-class unread/read state for `Lead` records. Today, a `LeadStatus.NEW` lead is treated as unread and needing reply.
- Add unified archive/reopen controls after the team decides whether lead closure and message-thread closure should share one status vocabulary.
- Add vendor/tenant inbox versions of the adapter once the landlord workflow is fully validated.

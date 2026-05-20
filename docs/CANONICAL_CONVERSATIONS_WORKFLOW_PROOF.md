# Canonical Conversations and Workflow Proof

v4.57.0 starts the canonical conversation migration and adds a focused proof view for maintenance, vendor, and inspector workflows.

## Canonical Conversation Migration

This release adds forward-compatible Prisma models:

- `Conversation`
- `ConversationParticipant`
- `ConversationEvent`

The migration deliberately preserves the existing `Lead`, `LeadNote`, `MessageThread`, and `Message` tables. Existing workflows keep working while the platform gains a canonical destination for future lead, application, maintenance, inspection, vendor, lease, tenant, and general conversations.

The service layer in `src/lib/conversations/canonical.ts` now normalizes:

- marketplace leads,
- lead notes,
- application threads,
- maintenance threads,
- lease/general threads,
- and permission checks for canonical conversation ids.

The landlord unified inbox now carries `canonicalConversationId` on every normalized thread so the UI and future migration jobs can refer to a stable canonical identity without forcing a destructive data rewrite.

## Maintenance/Vendor/Inspector Workflow Proof

The new `/admin/workflow-proof` route gives super/admin users a compact proof dashboard for:

- maintenance request intake,
- maintenance message context,
- assignment coverage,
- vendor profiles,
- vendor work logs,
- vendor invoices,
- inspection records,
- assigned inspections,
- failed/reinspection queues.

The view uses real database counts and links back to source workflow pages. It does not invent proof records.

## Verification

`canonical-conversations-workflow-proof:verify` checks the schema, migration, canonical service, unified inbox handoff, workflow proof page, admin navigation, and release metadata.

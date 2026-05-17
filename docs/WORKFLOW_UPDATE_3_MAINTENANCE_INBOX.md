# Workflow Update 3 — Maintenance + Inbox

Adds a first complete maintenance and messaging workflow for the platform.

## Added

- Applicant maintenance request page
- Admin maintenance queue
- Landlord-scoped maintenance queue
- Message threads connected to maintenance/application workflows
- Applicant, admin, and landlord inbox pages
- Staff-only internal message flag
- Maintenance assignment and status management
- Audit/security events for request creation and messaging
- Prisma migration for MaintenanceRequest, MessageThread, and Message

## Hobby/Vercel note

This workflow is request/response driven and does not require high-frequency cron. It is safe for Vercel Hobby deployments.

# Lease and Report Generation System

HomeBase MLS now has a platform-layer foundation for generated leases, reports, statements, and document packets.

## Architecture

Document generation is intentionally split into shared backend/domain logic and frontend workspace presentation.

Shared platform layer:

- Prisma models: `DocumentTemplate`, `DocumentTemplateVersion`, `GeneratedDocument`, `DocumentGenerationJob`
- Template seed registry: `src/lib/document-generation/templates.ts`
- Data builders: `src/lib/document-generation/builders.ts`
- Permission gates: `src/lib/document-generation/permissions.ts`
- Missing-field validation: `src/lib/document-generation/validation.ts`
- Render/storage adapters: `src/lib/document-generation/renderer.ts`, `src/lib/document-generation/storage.ts`
- Service/API orchestration: `src/lib/document-generation/service.ts`

Frontend layer:

- Workspace module: `src/components/document-generation/DocumentGenerationWorkspace.tsx`
- Landlord workspace route: `/landlord/document-generation`
- API routes:
  - `GET /api/document-generation/templates`
  - `POST /api/document-generation/preview`
  - `POST /api/document-generation/generate`
  - `GET /api/generated-documents/[id]/download`

## Supported Template Types

The schema supports:

- Lease and lease renewal
- Notices
- Tenant statements and rent ledgers
- Owner statements and rent rolls
- Property and unit summaries
- Maintenance and inspection reports
- Application packets
- Document compliance reports

The first implementation seeds:

- Generated Lease Draft
- Rent Roll Report
- Property Summary Report
- Tenant Rent Ledger
- Maintenance Summary Report
- Inspection Report
- Application Activity Report

## Missing-Field Validation

Every document data builder returns:

- `data`
- `requiredFields`
- `missingFields`
- `warnings`
- `relatedRecords`
- `suggestedDocumentTitle`

Users may preview a document with missing fields. Final generation is guarded when required fields are missing. Lease drafts include a legal-review warning because the system does not claim to produce jurisdiction-perfect legal leases without validated counsel-approved language.

## Versioning

Generated documents store the exact `templateVersionId` used. When a template changes later, old documents still point to the original version. Regeneration can use the original version or the latest published version through the service layer.

## Storage

Generated files use the existing document storage abstraction through:

- `saveGeneratedDocumentFile()`
- `getGeneratedDocumentFile()`
- `deleteGeneratedDocumentFile()`

The current implementation can store generated PDF/HTML/CSV-compatible bytes through the same database, local, or object-storage provider used by uploaded documents.

## Activity History

The generation service writes audit records for:

- Template creation
- Template publishing
- Preview
- Missing fields
- Generation/finalization
- Download
- Void

Future UI work should surface these audit records inside property, unit, tenant, application, lease, maintenance, inspection, and document workspaces.

## Future Expansion

Next steps:

- Add side-panel source-record editing for missing fields.
- Embed the generation module into unit, applicant, tenant, lease, maintenance, inspection, owner, and report workspaces.
- Add richer PDF/DOCX layout renderers.
- Add e-signature handoff for finalized lease drafts.
- Add organization-specific branding and template ownership when organization records are introduced.

# v4.2.0 Document Center Module

Adds a unified document center across admin, landlord, and applicant experiences.

Included:
- Shared document center DTO/query helper.
- Secure visible-document views using the existing authorization layer.
- Applicant document hub for requested documents, application files, leases, notices, and receipts.
- Landlord portfolio document hub with owner upload workflow.
- Dense document library with search, status, category, visibility, metrics, open requests, and direct downloads.
- Navigation wiring for landlord and applicant dashboards.

Storage continues to use the existing document storage abstraction, so Vercel deployments can use database/local storage for demos or S3/R2 for production scale.

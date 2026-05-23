# HomeBase MLS Enterprise UX Release Readiness

Date: 2026-05-21  
Version target: v4.61.5 enterprise pilot/demo readiness

## Executive Status

HomeBase MLS is ready to move toward controlled pilot/demo review once the local build, Prisma, and browser smoke tests pass in a Node/npm-enabled environment. The product now has broad route coverage for public marketplace, renter, tenant, landlord, property manager, vendor, inspector, owner, participant, caseworker/program, admin, super-admin, integration, and data governance workflows.

The current workspace could not run the app or browser QA because `npm` and `npx` are not available on PATH and `node_modules` is absent. This document therefore records a final static route/workflow readiness review plus the smoke tests that must be completed before pilot sign-off.

## Release-Ready UX Areas

- Public homepage: strongest visual identity and the theme reference for authenticated surfaces.
- Marketplace and listing detail: core renter conversion paths exist, including search, inquiry, tour request, favorite/save, apply, address privacy, and listing details.
- Primary role dashboards: applicant, tenant, participant, landlord, owner, caseworker, admin, and super-admin surfaces have clearer page shells, headers, next actions, cards, and role-specific language.
- Landlord inventory and unit workspace: canonical operational model is in place for managing properties, units, listings, occupancy, maintenance, applications, documents, ledger, messages, and timeline.
- Vendor field mode: mobile-first route exists for assigned jobs, media, estimates, invoices, notes, and status updates.
- Admin command center and data governance: normal admin operations are separated from super-admin operations, with governance, integration status, imports/exports, security, and audit paths surfaced.
- Release documentation: QA checklist, accessibility/mobile checklist, route inventory, and this readiness report now describe the pilot path and remaining risk.

## Pilot-Ready Only

These areas are suitable for demo/pilot only after verification with seeded data and explicit provider limitations:

- Renter profile and application flow: guided structure exists, but needs live form persistence, document upload, consent, and mobile QA.
- Tenant payments and ledger: UX labels are clearer, but real payment-provider setup, webhook idempotency, and reconciliation must be verified before real money movement.
- Maintenance with media: tenant/vendor/landlord flow exists, but file storage, upload limits, access-control tests, and mobile capture need live QA.
- Inspector checklist and failed-inspection corrections: route/model foundation exists, but checklist completion, evidence upload, reports, and correction workflows need end-to-end data validation.
- Lease/document center: document categories, signatures, sharing/revocation, and timeline concepts are present, but production PDF/e-sign behavior must be verified with real storage and sample packets.
- Owner portal: privacy posture and executive summaries exist, but owner statements and approvals need production-like accounting data review.
- Affordable housing workflows: participant, caseworker, program, RFTA, HAP/subsidy, payment standards, affordability, and certification scaffolds exist but require program/legal validation before use as official workflow.
- Integrations/API/webhooks: settings and diagnostic UX are present, but live provider setup, secrets, delivery retries, webhook signing, and audit trails need production validation.

## Still Scaffolded Or Provider-Dependent

- Live map/geocoding: structure exists; no fake coordinates should be used. Public maps require a configured provider and address privacy review.
- Screening: provider abstraction/mock support exists; real screening requires legal review, vendor contract, consent flows, data retention policy, and report access limits.
- Email/SMS: notification routing and queue concepts exist; actual delivery requires provider setup, opt-out compliance, bounce handling, and delivery audit.
- Payments/autopay: Stripe setup exists in env scaffolding; real payment operations require webhook validation, reconciliation, refund/dispute flows, and financial audit review.
- Accounting/QuickBooks: export/mapping structure exists; live sync requires provider setup and accounting review.
- MLS/RESO/syndication: mapping/status scaffolds exist; live feeds require partner credentials, validation rules, export audit, and non-destructive import matching.
- Lockbox/calendar sync: not implemented as live provider integration.
- Backup/restore: governance metadata exists; real database restore must use provider infrastructure and operational approval.

## Legal And Compliance Review Required

- Fair housing language on applications, screening, denials, conditional approvals, listing eligibility, voucher acceptance, and qualification criteria.
- Tenant screening authorization, adverse action, data retention, report visibility, and provider terms.
- Payment processing, late fees, autopay consent, refunds, disputes, trust accounting, and owner statements.
- Affordable housing, RFTA, voucher, HAP/subsidy, rent reasonableness, payment standards, utility allowance, certification/recertification, and inspection language.
- Privacy policy and terms for document storage, document sharing, communications, notifications, support impersonation, API/webhooks, and audit logging.
- Accessibility review for public-facing routes and core logged-in workflows before broad public launch.

## Final Route Review

| Area | Primary routes | UX release status | Release note |
| --- | --- | --- | --- |
| Public homepage | `/` | Release-ready pending live smoke | Theme source of truth. |
| Marketplace | `/marketplace` | Pilot-ready | Search/filter/list-map behavior needs browser QA and seeded listings. |
| Listing detail | `/marketplace/[unitId]` | Pilot-ready | Verify media, privacy-aware address, inquiry, tour, apply, and sticky mobile CTA. |
| Renter profile | `/applicant/profile` | Pilot-ready | Verify wizard persistence, readiness score, document wallet, consent copy. |
| Application flow | `/applicant/apply/[unitId]`, `/applicant/applications/[id]` | Pilot-ready | Verify active listing guard, consent/share record, missing items, success state. |
| Tenant dashboard/payments/maintenance | `/tenant`, `/tenant/payments`, `/tenant/maintenance` | Pilot-ready | Payments require real provider gating; maintenance media requires storage QA. |
| Participant dashboard | `/participant` | Pilot-ready | Plain-language milestones exist; program content requires compliance review. |
| Landlord dashboard | `/landlord` | Pilot-ready | Verify next actions, quick actions, portfolio summaries, mobile density. |
| Inventory | `/landlord/inventory`, `/landlord/property-unit-manager` | Pilot-ready | Canonical inventory exists; verify pagination, saved/quick views, mobile cards. |
| Unit workspace | `/landlord/units/[id]/workspace` | Pilot-ready | Strong enterprise concept; verify tab density and access scopes live. |
| Lead pipeline | `/landlord/leads`, `/landlord/leads/[id]` | Pilot-ready | Verify inquiry dedupe, CRM stage changes, showings, messages, applications. |
| Application review | `/landlord/applications`, `/landlord/applications/[id]` | Pilot-ready | Verify fair-housing-safe decision panel and screening data limits. |
| Lease/document center | `/landlord/documents`, `/landlord/lease-documents`, `/landlord/leases` | Pilot-ready | Verify document share/revoke/signature permissions with storage. |
| Financial pages | `/landlord/ledger`, `/landlord/payments`, `/admin/ledger` | Pilot-ready only | Must pass financial permission and reconciliation tests before real money use. |
| Vendor field mode | `/vendor/field`, `/vendor/field/[id]` | Pilot-ready | Mobile-first route; verify assigned-only access and upload flows. |
| Inspector checklist | `/inspector`, `/inspector/inspections/[id]` | Pilot-ready | Verify assigned-only access, required items, evidence, corrections, report. |
| Owner portal | `/owner`, `/owner/dashboard` | Pilot-ready | Verify privacy-safe owner statement/approval visibility. |
| Caseworker/program portal | `/caseworker`, `/caseworker/cases`, `/program` | Pilot-ready | Verify assigned/program scoped access and RFTA/document queues. |
| Housing authority portal | `/program`, `/program/payment-standards`, `/program/rfta`, `/program/subsidy` | Pilot-ready | Payment standards/affordability require program validation. |
| Admin command center | `/admin`, `/admin/command-center` | Pilot-ready | Normal admin cockpit is separated from super-admin-only tools. |
| Super-admin operations | `/admin/super-admin`, `/admin/system`, `/admin/impersonation` | Pilot-ready with caution | Verify reason capture, audit, restricted actions, and role guard. |
| Integrations/API/webhooks | `/admin/integrations`, `/landlord/integrations` | Pilot-ready scaffold | Secrets and provider calls must be verified in real environment. |
| Data governance | `/admin/governance`, `/admin/backups`, `/admin/audit` | Pilot-ready scaffold | Restore remains governed metadata unless real backup infra is configured. |

## End-To-End Smoke Tests To Complete

| Journey | Smoke path | Required pass criteria |
| --- | --- | --- |
| Renter searches and applies | `/` -> `/marketplace` -> listing detail -> inquiry/tour/apply -> application detail | Search renders, listing privacy holds, inquiry/lead created, active listing guard works, consent/success state visible. |
| Landlord creates listing and reviews lead/application | `/landlord` -> inventory/unit -> listing builder -> leads -> applications | Draft save works, readiness blocks unsafe publish, lead pipeline updates, application review shows missing items and safe decisions. |
| Tenant submits maintenance request | `/tenant/maintenance` -> new request -> media upload -> request detail | File validation works, request links to tenant/unit, success state and timeline render. |
| Vendor updates assigned work order | `/vendor/field` -> work order detail -> add note/media/status/estimate/invoice | Vendor sees assigned work only; actions create timeline/audit state and mobile controls are usable. |
| Inspector completes checklist | `/inspector` -> `/inspector/inspections/[id]` -> checklist -> review -> submit | Required items enforced, evidence attaches, pass/fail/correction logic works. |
| Owner views statement/approval | `/owner` -> statement/approval card | Owner sees assigned property only; no applicant PII/internal notes; approval actions gated. |
| Participant tracks RFTA/documents | `/participant` -> RFTA/document milestone | Plain-language status renders; participant sees own case only; document upload/request links work. |
| Caseworker reviews case/RFTA | `/caseworker` -> case detail -> RFTA/documents/messages | Assigned case visible, unrelated case blocked, packet missing items and next action render. |
| Admin reviews platform issue | `/admin/command-center` -> governance/integrations/security drilldown | Issue cards link to correct drilldowns, severity badges render, risky actions audited/gated. |
| Super admin reviews integration/API/governance tools | `/admin/super-admin` -> integrations/API/governance/impersonation | Super-admin-only access enforced, secrets masked, reason capture/audit required where supported. |

## Required Live QA Before Pilot Sign-Off

- Run full command verification from `RELEASE_CHECKLIST.md`.
- Start the app with seeded pilot data and capture desktop/mobile screenshots for the route list above.
- Run guessed-ID checks for every role with seeded records.
- Run mobile width checks at 390px for marketplace, listing detail, renter profile, application, tenant maintenance, landlord inventory, unit workspace, vendor field mode, inspector checklist, owner, participant, caseworker, and admin command center.
- Run keyboard-only checks for dashboard shell, mobile drawer, command palette, dialogs, tabs, filters, and forms.
- Run storage/download guessed-ID checks for documents, photos, maintenance media, inspection evidence, and owner documents.

## Release Decision

Current decision: **pilot/demo candidate, not production release signed off from this workspace**.

The remaining blocker is not a discovered code regression from this documentation update. It is an environment/toolchain blocker: this workspace cannot execute `npm`, `npx`, Prisma CLI, Next build, Vitest, or Playwright.

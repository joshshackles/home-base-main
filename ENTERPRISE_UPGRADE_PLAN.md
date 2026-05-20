# HomeBase MLS Enterprise Upgrade Plan

Version reviewed: 4.37.0  
Review date: May 19, 2026  
Primary code areas reviewed: `src/app`, `src/components`, `src/lib`, `prisma/schema.prisma`, `scripts`, and representative admin, landlord, applicant, vendor, marketplace, auth, dashboard, reporting, messaging, storage, and authorization modules.

## 1. Executive Summary

HomeBase MLS is no longer a small prototype in feature breadth. It already contains a public marketplace, role dashboards, applicant profiles, landlord operations, tenant records, vendor workflows, reports, payments, documents, inspections, maintenance, notifications, audit logs, and production-oriented storage/session helpers. The strongest recent improvements are the enterprise public homepage in `src/app/page.tsx`, the role dashboard architecture in `src/lib/dashboard/*`, and the landlord operating console in `src/app/landlord/page.tsx`.

The platform still feels short of enterprise-grade because its depth is uneven. Several workflows have good-looking surfaces but are implemented as large page-level components with duplicated query logic, inconsistent permission scoping, and inconsistent role-aware navigation. Some parts show production discipline, such as `src/lib/authorization.ts`, database sessions in `src/lib/auth.ts`, and document access in `src/app/api/documents/[id]/route.ts`. Other parts still depend on owner-only filters, demo account UX, placeholder-heavy forms, broad route/action helpers, or hand-built UI patterns that differ from page to page.

The biggest blockers are not missing features alone. They are coherence, safety, and reliability: centralizing permission scopes, making property-manager/caseworker/vendor/inspector access consistent, removing demo-facing affordances from production, hardening marketplace and application workflows, breaking large pages into reusable tested components, and proving behavior with tests/builds that run cleanly in a production-like environment.

## 2. Enterprise Readiness Scorecard

| Area | Score | Rationale |
| --- | ---: | --- |
| Public homepage and marketing experience | 8 | `src/app/page.tsx` now communicates marketplace plus operations clearly, uses live listing data, and avoids fake inventory. Remaining gaps are global header polish, auth entry-point consistency, and live visual QA across breakpoints. |
| Rental marketplace experience | 6 | `src/app/marketplace/page.tsx`, `src/app/marketplace/[unitId]/page.tsx`, and `src/lib/marketplace/listings.ts` provide real filters, listing cards, detail pages, and applicant-aware actions. It still needs map/list comparison, stronger mobile filter UX, saved search model, inquiry/application separation clarity, and better landlord reply threading. |
| Applicant/tenant workflow | 6 | `src/app/applicant/page.tsx`, `src/app/applicant/profile/page.tsx`, and `src/app/applicant/actions.ts` support reusable profiles, applications, documents, payments, and tenant mode. The dashboard is very large, has some mojibake separator text, and mixes applicant/tenant paths under `/applicant`, which can confuse real tenants. |
| Landlord workflow | 7 | The landlord console is substantially improved and `src/app/landlord/tenants/*` gives a CRM direction. Gaps remain in multi-property scale, property-manager scoping, page size, lead/message workflow depth, maintenance assignment lifecycle, and consistent use of shared components. |
| Dashboard system | 7 | `src/lib/dashboard/role-dashboard.ts`, `src/lib/dashboard/permissions.ts`, and `src/components/dashboard/RoleDashboard.tsx` establish a good architecture. Legacy dashboards still coexist, some nav is hardcoded per layout, and `/applicant` and `/landlord` do not consistently use the shared role-dashboard model. |
| Admin/system operations | 6 | Admin has many routes and reports, including `src/app/admin/system`, `src/app/admin/security`, `src/app/admin/reports`, and backups. It needs clearer operations queues, production health checks, admin-only safeguards around sample data, import/export governance, and fewer raw database-style pages. |
| Visual design consistency | 6 | The app has a recognizable card-heavy design language and `src/components/ui/system/index.tsx`. Many pages still define local `Card`, `Panel`, `Badge`, `MetricCard`, and status helpers, producing inconsistent radius, color, spacing, and typography. |
| Mobile responsiveness | 5 | `DashboardShell` has a mobile drawer and horizontal nav, and marketplace cards are responsive. Several dense dashboards, forms, and tables are likely hard to use on mobile without browser QA, especially landlord pages, reports, vendor operations, and tenant dashboard sections. |
| Data architecture | 7 | Prisma schema is broad and domain-rich: `User`, `Property`, `Unit`, `Application`, `ApplicantProfile`, `Occupancy`, `ProfileConnection`, `MaintenanceRequest`, `LeasePacket`, `LedgerEntry`, `VendorProfile`, reports, integrations, and audit models. The issue is not breadth; it is consistency of ownership relationships, status transitions, and access scopes across modules. |
| Permissions/security | 6 | Strong foundations exist in `src/lib/auth.ts`, `src/lib/authorization.ts`, document download authorization, password/session helpers, and audit logging. Risks remain around route/action drift, UI-only role hiding, owner-only scoping that omits approved access, public photo rules not checking `marketingStatus`, and production demo/sample affordances. |
| Code maintainability | 5 | There are helpful helpers and verifiers, but many pages are 500+ line server components with embedded query, formatting, UI, and workflow logic. Repeated status label/tone functions, query scopes, and form schemas increase regression risk. |
| Production readiness | 5 | The repo has many verification scripts, preflight, lockfile checks, Vercel migration runner, storage abstraction, and security checks. In this environment, `npm`, `node_modules`, typecheck, lint, and build are unavailable, and production must also remove demo login UX, verify envs, test migrations, and confirm permission coverage. |

## 3. Major Gaps

### Product/UX Gaps

- The product surface is broad but not yet simple enough for each user type. Applicants, tenants, landlords, inspectors, vendors, and admins can all do many things, but the next action is not always obvious outside the newest dashboard sections.
- Applicant and tenant experiences share `/applicant` routing. This helps reuse code but weakens mental models for residents who expect a tenant portal.
- Marketplace search is functional but not yet Zillow-level. It lacks saved searches, side-by-side map/list exploration, availability date filtering wired through data, and a polished no-results recovery flow.
- Landlord messaging is present in `/landlord/inbox`, `src/app/workflow-actions.ts`, and lead reply actions, but the lead reply path and message thread path are still partly separate.
- Admin operations has breadth but needs a single queue-based command center for access requests, data quality, failed integrations, blocked workflows, sample data controls, and production health.

### Visual Design Gaps

- UI primitives are inconsistent. `src/components/ui/system/index.tsx` exists, but many pages still define local card, badge, metric, panel, and empty-state components.
- The app uses multiple radius scales (`rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-[2rem]`) and many local color/tone systems.
- Dense dashboard pages frequently use high visual weight everywhere, making hierarchy less clear.
- Some text encoding issues appear in `src/app/applicant/page.tsx` as mojibake separator text, which makes the app feel unpolished.
- Forms are often placeholder-driven and long, especially property, unit, vendor, maintenance, and applicant profile forms.

### Workflow Gaps

- Property manager access is not consistently respected. `src/lib/dashboard/role-dashboard.ts` includes `propertyManagerUserId`, but many landlord pages/actions use only `property.ownerId === user.userId`.
- Lead, message, application, and tenant conversion are related but not always part of one clean lifecycle.
- Maintenance/vendor operations exist, but the vendor queue needs stronger acceptance, photo, estimate, approval, invoice, and payout state machines with landlord and tenant visibility.
- Reports are real but mostly operational tables. They need drilldown consistency, saved/exported report definitions, and permissions-aware filters for managers and admins.
- Admin access request approval is present but does not yet feel like a complete identity and permission administration workflow.

### Architecture/Code Gaps

- Large page files combine data fetching, business logic, formatting, UI, and action routing. Examples include `src/app/landlord/page.tsx`, `src/app/applicant/page.tsx`, `src/app/marketplace/page.tsx`, and `src/app/landlord/units/[id]/page.tsx`.
- Query scoping is duplicated across pages and actions instead of centralized by role/module.
- Status formatting and tone mapping are repeated in many files (`label`, `statusTone`, `humanize`, local badge components).
- Form handling uses Zod in many actions, which is good, but schemas and ownership checks are scattered.
- Verification scripts are numerous but mostly marker-based; they do not replace typecheck, integration tests, or permission tests.

### Data/Model Gaps

- `prisma/schema.prisma` is domain-rich but complex. The platform needs a documented canonical lifecycle for `LeadStatus`, `ApplicationStatus`, `RentalLifecycleStatus`, `UnitStatus`, `OccupancyStatus`, `MaintenanceRequestStatus`, `LeasePacketStatus`, and payment states.
- Property managers, caseworkers, inspectors, maintenance staff, vendors, and profile connections exist as concepts, but every module does not use the same access relationship model.
- Tenant and applicant identity resolution is split across `applicantUserId`, `applicantEmail`, `tenantUserId`, `Occupancy`, and `ProfileConnection`. This needs a canonical "person/renter relationship" strategy.
- Public listing visibility should consistently require both `UnitStatus.AVAILABLE` and `RentalMarketingStatus.ACTIVE`; `src/app/api/unit-photos/[id]/route.ts` currently treats available, non-archived photos as public without checking `marketingStatus`.

### Security/Permission Gaps

- `src/lib/authorization.ts` is the right direction, but many pages/actions do not call its helpers and instead embed local `ownerId` checks.
- `requireRole(["LANDLORD"])` allows approved landlord/property manager access through `src/lib/auth.ts`, but many downstream queries only use `ownerId`, creating confusing denials or empty data for approved property managers.
- Vendor actions use `requireUser` plus helper checks in some paths; this is good but should be made consistent and tested for ID guessing.
- Public endpoints should be audited. Document downloads are well protected; unit photos need stricter marketing status checks and possibly signed/private access for non-public photos.
- Demo login buttons and seed password references in `src/app/login/page.tsx` and `src/app/signup/page.tsx` are not acceptable in production without a deployment-mode guard.

### Production-Readiness Gaps

- This environment cannot run `npm`, `node_modules`, typecheck, lint, or build. The repo cannot be considered production-ready until these run in CI and locally.
- `scripts/preflight.ts` requires key files, envs, storage settings, and upload limits, but production readiness also needs automated role-permission tests and browser visual QA.
- Sample data routes and seed data are useful, but production must ensure sample-data imports are admin-only, audited, disabled or clearly controlled, and never confused with real data.
- Error handling is mostly thrown errors or redirects. Enterprise-grade UX needs route-level error boundaries, form-level error states, and operational error logging.

## 4. Page-by-Page Evaluation

### Public Homepage: `src/app/page.tsx`

- Current purpose: Public front door for marketplace search and platform positioning.
- What works: Strong enterprise framing, live listing data, no fake inventory, audience pathways, trust messaging, and clean CTAs.
- Weak or unfinished: Needs browser QA across breakpoints, global header alignment, and production copy review. Product preview is a design visual, not connected to live metrics, which is acceptable but should stay clearly non-metric.
- What needs to change: Validate visual rendering, refine header/footer pairing, add SEO metadata, and ensure homepage search fields match marketplace filter behavior.
- Priority: Medium.

### Public Header/Footer: `src/components/AppHeader.tsx`, `src/components/AppFooter.tsx`

- Current purpose: Global navigation and account entry points.
- What works: Simple marketplace/login/dashboard links, role-specific direct links for admin/landlord/applicant.
- Weak or unfinished: Header is not access-type aware, so approved access modules may be hidden. Mobile nav is a wrap row rather than a deliberate public menu. CTA wording still emphasizes "Apply" instead of role/audience paths.
- What needs to change: Use `getUserDashboardAccess`, add public mobile nav, route signed-in users to `/dashboard`, and align public nav with homepage positioning.
- Priority: High.

### Login/Register: `src/app/login/page.tsx`, `src/app/signup/page.tsx`

- Current purpose: Authentication and account creation, including vendor invitation and landlord access request.
- What works: Vendor invite path, landlord access request, password policy text, next redirect.
- Weak or unfinished: Demo accounts and seed password are visible. "Everyone starts with applicant dashboard" conflicts with enterprise role-based positioning. Register flow does not feel like an enterprise onboarding wizard.
- What needs to change: Hide demo helpers outside development, create audience-specific signup intent handling, clarify access request approval, and add stronger post-signup routing.
- Priority: Critical for production.

### Marketplace Search: `src/app/marketplace/page.tsx`, `src/lib/marketplace/listings.ts`

- Current purpose: Public rental discovery with filters, stats, cards, pagination, and applicant-aware favorites/profile matching.
- What works: Real Prisma filters, public listing status checks, profile matching, favorite state, pagination, stats, and city links.
- Weak or unfinished: No saved search model, no map view, filters are dense, stats may show zeros without explanation, and large query/page logic lives in one route.
- What needs to change: Add saved searches, responsive filter drawer, cleaner no-results recovery, availability filters, map/list optionality, and move search DTO/query assembly into testable helpers.
- Priority: High.

### Listing Detail: `src/app/marketplace/[unitId]/page.tsx`

- Current purpose: Public rental detail page, inquiry, favorite, and fast application entry.
- What works: Photo-first layout, detail metrics, applicant profile awareness, fast apply action, and guest lead fallback.
- Weak or unfinished: Inquiry and application paths can feel duplicative. The detail page is large. Applicant authorization copy should be more explicit and action outcome should redirect cleanly into applications.
- What needs to change: Merge question/apply context into one guided panel, show reusable packet readiness, and improve landlord reply linkage from leads into message threads.
- Priority: High.

### Role Dashboard Entry: `src/app/dashboard/page.tsx`, `src/lib/dashboard/*`, `src/components/dashboard/*`

- Current purpose: Role-aware dashboard builder and shared dashboard UI.
- What works: Good architecture with `getUserDashboardAccess`, `buildDashboardForUser`, module tools, metrics, attention items, and access-type expansion.
- Weak or unfinished: Existing role routes still use separate large dashboards, some access-aware nav is duplicated in layouts, and many dashboard metrics need deeper drilldowns.
- What needs to change: Make `/dashboard` the canonical home, move `/applicant`, `/landlord`, `/admin`, `/vendor`, and `/inspector` landing pages toward the shared model or clearly separate "module console" pages.
- Priority: High.

### Applicant/Tenant Dashboard: `src/app/applicant/page.tsx`

- Current purpose: Applicant journey dashboard, tenant dashboard, former tenant dashboard.
- What works: Supports profile completion, applications, favorites, utilities, tasks, payments, maintenance, lease/document access, and tenant mode.
- Weak or unfinished: Very large file with multiple dashboards, mixed applicant/tenant language, mojibake text, repeated local components, and limited separation of query/model/UI.
- What needs to change: Split into `ApplicantJourneyDashboard`, `TenantResidentDashboard`, `FormerTenantDashboard`, shared DTO builder, and shared UI components. Create `/tenant` alias or route if TENANT is a first-class role.
- Priority: High.

### Applicant Profile/Application: `src/app/applicant/profile/page.tsx`, `src/app/applicant/applications/*`, `src/app/applicant/actions.ts`

- Current purpose: Reusable renter profile, application detail, document upload, submission, lease signature.
- What works: Rich reusable profile fields, household/income models, packet reuse in `startMarketplaceApplication`, readiness validation in `buildApplicationReadiness`.
- Weak or unfinished: The profile is long and may feel bureaucratic. Authorization/share state is mostly implicit through application notes/details. Error handling is thrown rather than friendly in many actions.
- What needs to change: Add profile section completion summary, authorization audit trail, clear "what landlord can see" preview, autosave/confirm patterns, and consistent form error UX.
- Priority: High.

### Landlord Dashboard: `src/app/landlord/page.tsx`

- Current purpose: Landlord operating console.
- What works: Strong needs-attention layout, applications pipeline, messages, property/unit health, quick actions, tasks, maintenance, and new landlord empty state.
- Weak or unfinished: Large route file, local UI primitives, owner-only scoping, and no reuse of `src/lib/dashboard/role-dashboard.ts` access scope. Some metrics use recent slices rather than full counts.
- What needs to change: Extract a landlord dashboard DTO/query helper, standardize landlord scope, include property manager access, add pagination/drilldowns for large portfolios, and align with shared dashboard components.
- Priority: Critical.

### Landlord Property/Unit Management: `src/app/landlord/rentals/*`, `src/app/landlord/units/*`, `src/components/landlord/*`

- Current purpose: Manage properties, units, single-family homes, listing details, photos, tenants, staff, lifecycle, terms, contacts, maintenance.
- What works: Broad data capture, photo upload limits/signature checks, lifecycle statuses, staff assignment, tenant assignment, listing quality signals.
- Weak or unfinished: Property and unit flows are split across `/rentals` and `/units`, with potential confusion. Many owner-only filters exclude approved property managers. Forms are long and dense.
- What needs to change: Create a unified rental workspace route/component, centralize property/unit scope, add bulk filters/actions, and improve large-portfolio performance.
- Priority: High.

### Landlord Applications/Tenants: `src/app/landlord/applications/*`, `src/app/landlord/tenants/*`

- Current purpose: Review application packets and search/view tenant/applicant records.
- What works: Server-scoped tenant directory direction, packet details, profile visibility concepts, notes, statuses, and landlord application review.
- Weak or unfinished: Tenant privacy rules need more test coverage. Application review should better surface authorization/share state and locked sections. Tenant directory needs pagination and bulk workflows for scale.
- What needs to change: Add explicit tenant visibility tests, shared applicant packet DTO, locked/private data components, and landlord next-action workflow.
- Priority: Critical for privacy.

### Messaging/Inbox: `src/app/landlord/inbox/page.tsx`, `src/app/applicant/inbox/page.tsx`, `src/app/workflow-actions.ts`, `src/lib/messaging.ts`

- Current purpose: Message threads tied to applications and maintenance.
- What works: Threads have application/maintenance context, internal notes, unread timestamps, and server-side access helpers.
- Weak or unfinished: Leads and messages are still somewhat separate; direct reply from a lead uses email plus lead notes, while application/maintenance use message threads. Message UX likely needs mobile QA.
- What needs to change: Convert lead questions into first-class message threads or provide a unified inbox adapter that includes lead questions, application threads, and maintenance threads.
- Priority: High.

### Maintenance/Vendor: `src/app/landlord/maintenance/page.tsx`, `src/app/vendor/*`, `src/components/vendors/*`, `src/lib/vendors/index.ts`, `src/app/vendor-actions.ts`

- Current purpose: Owner vendor center, vendor portal, assigned jobs, invoices, photos, estimates, payouts, recurring tasks.
- What works: Real models and actions exist for assignment, acceptance, logs, photos, estimates, invoices, payouts, SLA metrics, and recurring maintenance.
- Weak or unfinished: UI is form-heavy, mobile field mode is not truly optimized, vendor access checks should be audited for every action, and work order status transitions need a clearer state machine.
- What needs to change: Create a work-order command center, mobile field mode, estimate approval UI, invoice-to-payout lifecycle, and permission tests for vendor ID guessing.
- Priority: High.

### Inspector: `src/app/inspector/page.tsx`, `src/app/inspector/layout.tsx`

- Current purpose: Assigned inspection dashboard.
- What works: Dedicated route/layout and dashboard builder support.
- Weak or unfinished: Inspector is underdeveloped compared with applicant/landlord/vendor. It appears mostly a queue rather than a full inspection reporting workflow.
- What needs to change: Add inspection detail workflow, photo upload, checklist completion, failed-item tracking, reinspection scheduling, and report exports.
- Priority: Medium.

### Admin Operations: `src/app/admin/*`, `src/lib/admin-ops.ts`, `src/lib/workflow-readiness.ts`

- Current purpose: System-wide management, users, reports, operations, security, backups, integrations, workflows.
- What works: Broad admin route coverage, role protection, reports, audit/security routes, backups, sample data route, and operations modules.
- Weak or unfinished: Admin IA is broad and can feel like a list of modules. Needs a unified operations queue, production health surface, access-request workflow, and data-quality remediation.
- What needs to change: Build an admin command center with queue cards, failed jobs/integrations, sample data controls, migration/env health, and audit/security triage.
- Priority: High.

### Reports/Analytics: `src/lib/reports/index.ts`, `src/components/reports/ReportsDashboard.tsx`, `src/app/*/reports/*`

- Current purpose: Occupancy, delinquency, cash flow, leasing, funnel, maintenance, vendor, inspection, communications reports and exports.
- What works: Real queries, CSV generation, landlord/admin scoping, many sections.
- Weak or unfinished: Scope helpers are report-specific and owner-only for landlords. Drilldowns need consistent UX. Exports need audit logs and saved report definitions.
- What needs to change: Centralize report scope, add export audit, saved reports, scheduled exports, and permission tests.
- Priority: Medium.

### Payments/Ledger: `src/app/payments/*`, `src/lib/payments/*`, `src/lib/ledger*.ts`

- Current purpose: Stripe Connect, tenant payments, scheduled payments, ledger, reconciliation, statements.
- What works: Many production-hardening models and scripts exist.
- Weak or unfinished: Payment actions frequently use owner-only unit filters. Full financial correctness requires integration tests and Stripe webhook end-to-end validation.
- What needs to change: Centralize financial permission scopes, add ledger invariants, idempotency tests, webhook replay tests, and operator diagnostics.
- Priority: Critical before real money.

### Documents/Storage: `src/lib/storage.ts`, `src/app/api/documents/[id]/route.ts`, `src/components/documents/DocumentCenterView.tsx`

- Current purpose: Upload, store, authorize, and download documents.
- What works: Storage abstraction supports local/database/S3, MIME signature checks, document authorization, and download audit logs.
- Weak or unfinished: Production default can be database storage, which is not ideal at scale. Document visibility rules need role matrix tests, and UI should show who can see each document.
- What needs to change: Require S3-compatible storage for production, add visibility matrix tests, and show document sharing state explicitly.
- Priority: High.

## 5. Role-Based Workflow Evaluation

### Applicant

- User goal: Find housing, build a reusable profile, apply quickly, authorize sharing, message landlords, upload documents, track decisions.
- Current support: Good feature coverage through `/marketplace`, `/applicant/profile`, `/applicant/applications`, `/applicant/documents`, and `startMarketplaceApplication`.
- Missing: Saved searches, clearer share authorization preview, better application confirmation, less intimidating profile sections, and consistent form errors.
- Dashboard should feature: Profile readiness, missing required packet sections, saved homes/searches, active applications, unread landlord messages, document/signature requests, move-in checklist.
- Updates needed: Profile readiness module, share preview, marketplace fast-apply panel, saved search model, applicant message/thread unification.

### Tenant

- User goal: Manage current rental, lease, rent/payments, maintenance, notices, inspections, documents, and landlord messages.
- Current support: Tenant mode exists inside `/applicant/page.tsx` using `Occupancy`, `Unit`, `LeasePacket`, `TenantPayment`, maintenance, notices, and documents.
- Missing: First-class `/tenant` route, tenant-specific nav labels, payment status clarity, maintenance history, and mobile resident UX.
- Dashboard should feature: Current unit, lease status, next rent/payment item, open maintenance, notices, inspections, documents, messages.
- Updates needed: Tenant route alias, resident shell/nav, split tenant dashboard component, tenant document/payment privacy tests.

### Landlord/Property Manager

- User goal: Manage properties, units, listings, leads, applications, tenant records, messages, leases, maintenance, inspections, documents, payments, reports.
- Current support: Strong landlord console, rentals, tenants, applications, maintenance, reports, vendors, payments, documents.
- Missing: Consistent property-manager access, bulk management for many units, unified rental workspace, lead/message merge, true application review workflow, and large-portfolio performance.
- Dashboard should feature: Unread questions, waiting applications, vacant/incomplete listings, lease tasks, maintenance, inspection schedule, tenant directory, rent exceptions.
- Updates needed: Central landlord scope helper, route/action audit, rental workspace refactor, application packet review DTO, unified inbox.

### Inspector

- User goal: See assigned inspections, perform checklist, upload photos, submit findings, track failed/reinspection work, generate reports.
- Current support: Role dashboard and inspector route exist.
- Missing: Full inspection detail workflow, field-oriented checklist UI, report export, photo evidence, and reinspection handoff.
- Dashboard should feature: Today, upcoming, reports due, failed/reinspection queue, assigned units, start-inspection actions.
- Updates needed: Inspection detail page, checklist state machine, photo upload, report generation, assignment tests.

### Vendor/Maintenance

- User goal: Accept jobs, update work, upload photos, submit estimates/invoices, track payout eligibility, communicate with landlord/tenant.
- Current support: Vendor portal, actions, profiles, jobs, invoices, work logs, photos, estimates, payout metrics.
- Missing: Mobile field mode, clear state transitions, estimate approval workflow, tenant communication rules, and field photo gallery UX.
- Dashboard should feature: Assigned jobs, waiting acceptance, SLA risk, estimates waiting, invoices, payout eligibility, recent service records, contacts.
- Updates needed: Work-order state machine, vendor mobile UI, estimate approval screen, invoice/payout audit, vendor permission tests.

### Admin

- User goal: Keep the platform safe, healthy, permissioned, auditable, and operationally visible.
- Current support: Admin routes, reports, security, audit, system, backups, users, operations, integrations.
- Missing: Enterprise operations queue, access request review UX, data quality repair, production environment health, failed integration diagnostics, sample data governance.
- Dashboard should feature: Access requests, active users, security events, failed integrations, blocked workflow tasks, reporting exports, data quality issues, audit alerts.
- Updates needed: Admin command center, access request workflow, production health checks, audit/search tools, data quality queue.

## 6. Security and Permission Review

- `src/lib/auth.ts` correctly uses database-backed sessions when possible and verifies legacy signed sessions against active users. This is a good foundation.
- `requireRole` maps certain roles to approved `AccountAccessType` values. That means a user with approved landlord/property-manager access can pass landlord route/layout gates.
- The next layer is inconsistent. Many landlord pages and actions query only `property.ownerId === user.userId`, so approved property managers may pass the gate but receive empty data or be denied by local owner checks.
- `src/lib/authorization.ts` has reusable functions for properties, units, applications, maintenance, message threads, documents, lease packets, inspections, and ledger entries. This file should become mandatory for record-level access instead of optional.
- Tenant/applicant data needs a matrix test suite. Sensitive applicant details should only be returned through application ownership, authorized profile sharing, active occupancy, or profile connection. `src/app/landlord/tenants/*` and application packet views should be covered by ID-guessing tests.
- Public photos should only be public for actively marketed available listings. `src/app/api/unit-photos/[id]/route.ts` checks `UnitStatus.AVAILABLE` and archived property state but not `marketingStatus: "ACTIVE"`.
- Public lead submission in `src/app/marketplace/actions.ts` has honeypot, rate limiting, CAPTCHA, duplicate suppression, and public availability checks. It should also require `marketingStatus: "ACTIVE"` like the detail page.
- Document download in `src/app/api/documents/[id]/route.ts` is strong: it requires a verified user, calls `getAuthorizedDocument`, logs denials, and audits downloads.
- Internal notes are guarded through `canWriteInternalNote`, but every UI and server action that toggles `isInternal` should be tested.
- Admin-only routes generally use `requireRole(["ADMIN"])`, but sample-data and backup routes need production-mode controls and audit trails.
- Payment and ledger actions must be treated as high risk. Owner-only checks should be replaced with centralized financial access scopes and tests.

## 7. Recommended Enterprise Architecture Direction

### Dashboard System

- Keep `src/lib/dashboard/role-dashboard.ts`, `role-config.ts`, and `permissions.ts` as the dashboard foundation.
- Add module-specific dashboard DTO files: `src/lib/dashboard/applicant.ts`, `tenant.ts`, `landlord.ts`, `inspector.ts`, `vendor.ts`, `admin.ts`.
- Make `/dashboard` the canonical entry point and make role landing routes either render module dashboards or specialized consoles with shared DTOs.

### Permission Helpers

- Create `src/lib/access/scopes.ts` with reusable `getLandlordUnitScope(user)`, `getLandlordPropertyScope(user)`, `getApplicantApplicationScope(user)`, `getVendorWorkScope(user)`, `getInspectorAssignmentScope(user)`, and `getAdminScope(user)`.
- Every page, action, report, export, and API route should use these helpers or `src/lib/authorization.ts`.
- Add permission tests for ID guessing across applications, documents, photos, units, tenants, messages, maintenance, ledger entries, reports, and exports.

### Shared UI Components

- Promote `src/components/ui/system/index.tsx` into the common design layer: `PageHeader`, `MetricCard`, `StatusBadge`, `EmptyState`, `DataTable`, `FilterBar`, `FormSection`, `ActionMenu`, `Timeline`, `ResponsiveDrawer`.
- Replace local `Card`, `Panel`, `Badge`, `MetricCard`, `statusTone`, and `label` helpers over time.
- Create `src/lib/status-format.ts` for status labels, tone classes, and next-action copy.

### Marketplace/Listing Components

- Move marketplace search model/query into `src/lib/marketplace/search.ts`.
- Split `src/app/marketplace/page.tsx` into `MarketplaceHero`, `MarketplaceFilters`, `MarketplaceResults`, `MarketplaceStats`, `SavedSearchCTA`.
- Split `src/app/marketplace/[unitId]/page.tsx` into `ListingGallery`, `ListingFacts`, `ApplicantApplyPanel`, `GuestInquiryPanel`, `ListingCosts`, `ListingPolicies`.

### Form and Validation Patterns

- Keep Zod schemas, but move route-specific schemas from actions into `src/lib/forms/*` where reusable.
- Add a server action result pattern for friendly errors instead of throwing raw errors in user-facing forms.
- Standardize confirmation query params and success banners.

### Audit/Logging Strategy

- Continue using `writeAuditLog`, but require audit logs for: access grant/revocation, sensitive document download, applicant packet share authorization, tenant activation/end, payment/ledger mutation, vendor invoice/payout state, admin data export, sample data import/export.
- Add structured logs for failed integrations and failed background jobs.

### Testing Strategy

- Add unit tests for access scopes and status transitions.
- Add integration tests for server actions with unauthorized IDs.
- Add Playwright smoke tests for homepage, marketplace search/detail/apply, applicant dashboard/profile/application, landlord dashboard/application review/inbox, tenant directory, vendor job update, admin access request.
- Keep marker verifiers, but treat them as release guardrails, not correctness tests.

## 8. Prioritized Roadmap

### Phase 1: Foundation and Safety

- Goal: Remove production blockers and centralize access control.
- Updates included: Hide demo login/signup affordances outside development; create central scope helpers; fix public photo and public lead marketing-status checks; audit landlord/property-manager scoping; repair mojibake; add route/action permission tests.
- Files/areas likely affected: `src/lib/auth.ts`, `src/lib/authorization.ts`, new `src/lib/access/scopes.ts`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/api/unit-photos/[id]/route.ts`, `src/app/marketplace/actions.ts`, landlord pages/actions.
- Expected outcome: Safer production posture and consistent access expectations.
- Risk level: High because permissions affect many workflows.
- Dependencies: Clear decision on property-manager authority and production/demo deployment mode.

### Phase 2: Role-Based Dashboard and Workflow Clarity

- Goal: Make every dashboard and nav role-aware, coherent, and action-driven.
- Updates included: Split dashboard builders, align `/dashboard`, `/applicant`, `/tenant`, `/landlord`, `/vendor`, `/inspector`, `/admin`; access-aware global header; shared dashboard components; needs-attention drilldowns.
- Files/areas likely affected: `src/lib/dashboard/*`, `src/components/dashboard/*`, `src/components/layout/DashboardShell.tsx`, role layouts/pages.
- Expected outcome: Each user sees the right tools, metrics, and next actions.
- Risk level: Medium.
- Dependencies: Phase 1 scope helpers.

### Phase 3: Marketplace and Application Experience

- Goal: Make searching, asking, and applying feel fast and trustworthy.
- Updates included: Saved searches, filter drawer, listing detail apply panel, reusable packet preview, explicit share authorization, unified lead/question/thread model, application confirmation/redirect polish.
- Files/areas likely affected: `src/app/marketplace/*`, `src/lib/marketplace/*`, `src/app/applicant/actions.ts`, `src/app/landlord/leads/*`, `src/app/landlord/applications/*`.
- Expected outcome: Signed-in applicants can apply in a few clicks and landlords can reply easily.
- Risk level: Medium.
- Dependencies: Permission tests for profile sharing.

### Phase 4: Landlord Operations

- Goal: Make each rental record a true work center at scale.
- Updates included: Unified rental workspace, bulk property/unit filters, tenant directory improvements, application packet review DTO, inbox unification, maintenance/vendor lifecycle, lease/document workflows.
- Files/areas likely affected: `src/app/landlord/rentals/*`, `src/app/landlord/units/*`, `src/app/landlord/tenants/*`, `src/app/landlord/actions.ts`, `src/lib/profile-connections.ts`, `src/lib/vendors/index.ts`.
- Expected outcome: Landlords can operate portfolios without hunting across modules.
- Risk level: High.
- Dependencies: Phase 1 access scopes and Phase 3 application model clarity.

### Phase 5: Admin and Enterprise Operations

- Goal: Give administrators production operations visibility and controls.
- Updates included: Admin command center, access-request workflow, data quality queue, failed integration diagnostics, audit search, report/export governance, sample data controls, backup/restore status.
- Files/areas likely affected: `src/app/admin/*`, `src/lib/admin-ops.ts`, `src/lib/security-events.ts`, `src/lib/integrations-real.ts`, `src/lib/reports/index.ts`.
- Expected outcome: Admins can operate the platform safely across users, workflows, and data.
- Risk level: Medium.
- Dependencies: Central audit/logging and permission strategy.

### Phase 6: Visual Polish and Production Hardening

- Goal: Make the product cohesive, responsive, accessible, observable, and shippable.
- Updates included: Shared design system migration, mobile QA, accessibility pass, error boundaries, performance profiling, CI typecheck/lint/build/tests, production env checks, documentation.
- Files/areas likely affected: shared components, all major pages, `scripts/preflight.ts`, CI config, docs.
- Expected outcome: Enterprise-ready presentation and operational reliability.
- Risk level: Medium.
- Dependencies: Earlier workflow and architecture cleanup to avoid polishing unstable surfaces.

## 9. Next 10 Recommended Updates

### 1. Production Mode and Demo UX Guard

- Goal: Remove demo-facing auth UI from production.
- Why it matters: Demo accounts and seed passwords on login/signup are immediate trust and security red flags.
- What to change: Add deployment-mode helper and conditionally hide `DEMO_ACCOUNTS`, `DEMO_PASSWORD`, and seed password text outside development/demo.
- Likely files: `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/lib/demo-accounts.ts`, `src/lib/deployment-mode.ts`, `scripts/preflight.ts`.
- Acceptance criteria: Production build cannot render demo account buttons or seed password text; dev/demo can still use them intentionally.
- Estimated difficulty: Small.
- Order: First.

### 2. Central Access Scope Helpers

- Goal: Replace ad hoc owner-only filters with reusable permission scopes.
- Why it matters: Current `requireRole` supports approved access, but many queries only use `ownerId`.
- What to change: Add `src/lib/access/scopes.ts`; use it for landlord/property manager, applicant/tenant, vendor, inspector, admin scopes.
- Likely files: `src/lib/authorization.ts`, `src/lib/dashboard/role-dashboard.ts`, landlord pages/actions, reports, payments.
- Acceptance criteria: Property managers with approved access see and can act on assigned units consistently; unauthorized ID guesses fail.
- Estimated difficulty: Large.
- Order: Before dashboard, landlord, reports, and payments refactors.

### 3. Public Asset and Lead Visibility Hardening

- Goal: Make public listing access rules consistent.
- Why it matters: Listing detail and marketplace require `marketingStatus: "ACTIVE"`, but public photo and lead checks do not consistently do so.
- What to change: Require `UnitStatus.AVAILABLE`, `marketingStatus: "ACTIVE"`, and non-archived property for public photo access and public lead creation.
- Likely files: `src/app/api/unit-photos/[id]/route.ts`, `src/app/marketplace/actions.ts`, `src/lib/marketplace/listings.ts`.
- Acceptance criteria: Draft/paused available units do not expose photos or accept public leads.
- Estimated difficulty: Small.
- Order: After or alongside Update 2.

### 4. Permission Test Matrix

- Goal: Prove access control at record level.
- Why it matters: Enterprise trust depends on server-side authorization, not hidden links.
- What to change: Add tests for document, unit, application, tenant directory/detail, message thread, maintenance, vendor job, ledger/report export access.
- Likely files: `tests/unit`, `tests/e2e`, `src/lib/authorization.ts`, new scope helpers.
- Acceptance criteria: Tests cover admin, landlord owner, property manager, applicant, tenant, inspector, vendor, unrelated user.
- Estimated difficulty: Large.
- Order: Immediately after central scopes.

### 5. Role-Aware Global Navigation

- Goal: Align public header and dashboard shell with real access modules.
- Why it matters: Users with approved access currently may not see correct global links.
- What to change: Use `getUserDashboardAccess` in `AppHeader`; make signed-in dashboard link go to `/dashboard`; keep role/access-specific secondary links.
- Likely files: `src/components/AppHeader.tsx`, `src/lib/dashboard/permissions.ts`, `src/components/layout/DashboardShell.tsx`.
- Acceptance criteria: Header links match available modules; applicants do not see landlord/admin links unless approved.
- Estimated difficulty: Medium.
- Order: After central access helper decisions.

### 6. Applicant/Tenant Dashboard Split

- Goal: Make renter and resident experiences distinct and maintainable.
- Why it matters: `src/app/applicant/page.tsx` is too large and mixes applicant/tenant/former tenant flows.
- What to change: Extract query builders and components; create `/tenant` route or clear tenant alias; fix mojibake.
- Likely files: `src/app/applicant/page.tsx`, new `src/components/applicant/*`, new `src/components/tenant/*`, new `src/lib/dashboard/tenant.ts`.
- Acceptance criteria: Applicant, active tenant, and former tenant views render from separate components with shared primitives and tests.
- Estimated difficulty: Large.
- Order: After permissions foundation.

### 7. Marketplace Apply and Question Flow Upgrade

- Goal: Make signed-in application a few clear clicks and landlord reply simple.
- Why it matters: This is a core product promise.
- What to change: Add reusable packet preview, explicit share authorization, one apply confirmation, application redirect, and unify lead question into inbox/thread context.
- Likely files: `src/app/marketplace/[unitId]/page.tsx`, `src/app/applicant/actions.ts`, `src/app/marketplace/actions.ts`, `src/app/landlord/leads/*`, `src/app/landlord/inbox/page.tsx`.
- Acceptance criteria: Signed-in applicant can apply from listing with packet authorization; landlord sees question/application context and can reply from dashboard/inbox.
- Estimated difficulty: Large.
- Order: After Updates 2-4.

### 8. Landlord Rental Workspace Refactor

- Goal: Make each rental page the work center.
- Why it matters: Landlords manage by property/unit, not by app module.
- What to change: Build a reusable `RentalWorkspace` with tabs/sections for listing, leads, applications, tenant, lease, rent, deposit, ledger, maintenance, contacts, inspections, documents, notes, timeline.
- Likely files: `src/app/landlord/rentals/[id]/page.tsx`, `src/app/landlord/units/[id]/page.tsx`, `src/components/landlord/*`, `src/lib/rental-lifecycle-*`.
- Acceptance criteria: One rental detail page answers what is public, who applied, who lives there, what money/work/docs are open, and what action is next.
- Estimated difficulty: Large.
- Order: After access scopes and marketplace/application clarity.

### 9. Admin Operations Command Center

- Goal: Make admin feel like a production operations console.
- Why it matters: Enterprise buyers need platform control, not just admin tables.
- What to change: Build queues for access requests, security events, failed integrations, workflow blockers, data quality, exports, sample data controls, and environment health.
- Likely files: `src/app/admin/page.tsx`, `src/app/admin/operations/page.tsx`, `src/lib/admin-ops.ts`, `src/lib/security-events.ts`, `src/lib/integrations-real.ts`.
- Acceptance criteria: Admin can see and triage production issues from one page with audit-backed actions.
- Estimated difficulty: Large.
- Order: After core permission foundation.

### 10. Design System Consolidation and Mobile QA

- Goal: Make the platform visually cohesive.
- Why it matters: Enterprise-grade perception depends on consistency as much as feature count.
- What to change: Standardize cards, tables, badges, buttons, forms, empty states, status tones, layout spacing, and mobile patterns through shared primitives.
- Likely files: `src/components/ui/system/index.tsx`, `src/components/layout/DashboardShell.tsx`, dashboard pages, marketplace pages, landlord/applicant/admin/vendor pages.
- Acceptance criteria: No major route defines its own status badge/tone/card system unless justified; key flows pass desktop/mobile visual QA.
- Estimated difficulty: Large.
- Order: After main workflow surfaces stabilize.

## 10. Production Readiness Checklist

- Authentication: Database sessions enabled, secure cookies, password reset tested, inactive users blocked, forced reset tested.
- Authorization: Central scopes used everywhere; ID-guessing tests pass for units, applications, tenants, messages, maintenance, documents, ledger, reports, exports.
- Data privacy: Applicant profile sharing is explicit, auditable, revocable where applicable, and visible to both applicant and landlord.
- Demo safety: Demo accounts, seed passwords, sample data controls, and test-only links hidden or disabled in production.
- Error handling: Major routes have `error.tsx` or form-level error states; server action errors are user-friendly and logged.
- Responsive design: Homepage, marketplace, listing detail, applicant profile/applications, tenant dashboard, landlord console, rental workspace, admin operations, vendor jobs tested at mobile/tablet/desktop.
- Accessibility: Forms have labels, dialogs/drawers have roles, keyboard paths work, color contrast checked, focus states visible.
- Typecheck/build: `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run verify` pass in CI.
- Tests: Unit tests for permissions/status helpers, action tests for unauthorized IDs, Playwright smoke tests for critical flows.
- Database migrations: Fresh install and existing Neon/Vercel migration paths tested; migration scripts idempotent where intended.
- Seed/demo data safety: Seed data cannot be mistaken for production data; sample-data route admin-only, audited, and production-gated if needed.
- Logging/auditing: Sensitive actions write audit logs; failed auth/access attempts are logged without leaking data.
- Performance: Large portfolio pages paginate or virtualize; report queries bounded; N+1 patterns audited.
- Storage: Production uses S3-compatible document storage; document and photo reads are authorized and cache rules are intentional.
- Backups/recovery: Admin backup/export flow tested; restore/recovery procedure documented.
- Payments: Stripe webhook idempotency, replay, refunds/disputes, payout events, and ledger invariants tested before real money.
- Admin controls: Access request approval, user disable/session revoke, audit search, security event triage, integration diagnostics, sample data controls ready.
- User onboarding: Signup flows by renter, landlord, vendor invite, and account-access request are clear and tested.
- Documentation: Operator docs for deployment, env vars, migrations, storage, email, payments, integrations, and incident response.

## 11. Immediate Red Flags

- Demo account buttons and seed password text are visible in `src/app/login/page.tsx` and `src/app/signup/page.tsx`. This must be gated before production.
- Property-manager access is architecturally acknowledged but inconsistently implemented. Many landlord pages/actions use `property.ownerId === user.userId`, while `requireRole(["LANDLORD"])` can allow approved property-manager access.
- Public unit photo access in `src/app/api/unit-photos/[id]/route.ts` does not check `marketingStatus: "ACTIVE"`, so paused/draft but available units may expose photos.
- Public lead creation in `src/app/marketplace/actions.ts` checks `status: "AVAILABLE"` and non-archived property, but should also check `marketingStatus: "ACTIVE"`.
- `src/app/applicant/page.tsx` contains mojibake separator text and is too large for safe ongoing iteration.
- Several critical pages have repeated local status/tone helpers, making status meanings drift across the product.
- Financial/payment actions use local owner-only checks and need centralized financial permission scopes before real payments.
- The repository contains many marker-style verification scripts. They are useful release checks but do not prove production behavior or permissions.
- In this workspace shell, `npm` and `node_modules` are unavailable, so typecheck, lint, build, and test execution cannot currently be verified.
- Some admin/sample-data capabilities are intentionally admin-protected, but production should also gate and audit sample-data controls to prevent accidental use.

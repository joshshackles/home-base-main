## v4.61.4 - Homepage Reference Fidelity Pass

- Tightened the public homepage toward the uploaded MLS reference: shorter image-led hero, deep navy overlay, square CTAs, overlapping search panel, wider content rail, and compact trust/listing rhythm.
- Added a cropped apartment-building starter slide derived from the uploaded image so the fallback slider visual matches the reference instead of showing the full mockup screenshot.
- Added `homepage-reference-fidelity-pass:verify` to keep the reference-specific hero/search/header markers covered.

## v4.61.3 - Dashboard Shell Sparkles Icon Fix

- Fixed the admin navigation type error caught by Vercel by adding `Sparkles` to the typed `DashboardShell` icon registry.
- Added `dashboard-shell-sparkles-icon-fix:verify` so new typed shell icons remain covered before `next build`.

## v4.61.2 - Admin Branding Slide Search Param Fix

- Fixed the `/admin/branding` type error caught by Vercel by adding the `slide` query parameter to the page search params contract.
- Added `admin-branding-slide-search-param-fix:verify` so the homepage slider confirmation state stays covered by release gates.

## v4.61.1 - Tenant Portal Navigation Gate Fix

- Updated the tenant portal completion release gate to match the role-visibility cleanup, where tenant Tasks and Calendar pages remain available by direct route but are no longer primary navigation items.
- Added `tenant-nav-minimum-fix:verify` so Vercel catches regressions in the minimum-necessary tenant portal nav model before `next build`.

## v4.61.0 - Homepage Slider Marketplace Refresh

- Rebuilt the public homepage into a reference-style rental marketplace front door with a large image-led hero, prominent search controls, trust strip, featured rentals, role pathways, and stronger calls to action.
- Added admin-managed homepage hero slider support with `HomepageHeroSlide`, public slide image delivery, upload/update/delete controls in `/admin/branding`, and audit logging.
- Included the provided apartment-building image as the starter homepage slide while allowing admins to replace or rotate images from the dashboard.
- Added `homepage-slider-marketplace-refresh:verify` and wired it into local and Vercel release gates.

## v4.60.0 - Role Visibility and Workflow Simplification

- Added a central role capability map for minimum-necessary interface rules across applicant, tenant, landlord/property manager, caseworker, inspector, vendor/maintenance, admin, and super-admin workflows.
- Updated role layouts to use server-side workspace access checks and filtered navigation so direct URL access and visible UI follow the same permission model.
- Simplified role navigation by removing duplicate role-home links, consolidating landlord leads into the unified inbox, keeping tenant/applicant experiences separate, and hiding super-admin-only security/audit tools from normal admin navigation.
- Added `role-visibility-workflow-simplification:verify` and documented the role visibility model in `docs/ROLE_VISIBILITY_WORKFLOW_SIMPLIFICATION.md`.

## v4.59.5 - Maintenance Priority Enum Fix

- Fixed the unified landlord inbox type error caught by Vercel by replacing the nonexistent `MaintenancePriority.EMERGENCY` reference with the real `MaintenancePriority.URGENT` enum.
- Preserved urgent inbox prioritization for urgent maintenance conversations.
- Added `maintenance-priority-enum-fix:verify` and wired it into local and Vercel release gates.

## v4.59.4 - Lead Authorization Relation Fix

- Fixed the authorization type error caught by Vercel by selecting the `Lead.application` relation instead of a nonexistent `Lead.applicationId` scalar.
- Updated `canAccessLead` to check `lead.application?.id` before delegating to `canAccessApplication`.
- Added `lead-authorization-relation-fix:verify` and wired it into local and Vercel release gates.

## v4.59.3 - Admin Command Center Inspection Title Fix

- Fixed the admin command-center failed-inspections drilldown type error caught by Vercel by replacing the nonexistent `Inspection.title` field with a generated inspection record label.
- Added `inspectionRecordTitle` so failed inspection rows use inspector name, status, scheduled date, or created date from real schema fields.
- Added `admin-command-center-inspection-title-fix:verify` and wired it into local and Vercel release gates.

## v4.59.2 - Admin Command Center Null Date Fix

- Fixed the admin command-center drilldown type error caught by Vercel by safely formatting nullable message-thread `lastMessageAt` values.
- Added `formatAdminDate` so empty or legacy threads display a clear fallback instead of assuming a last-message timestamp exists.
- Added `admin-command-center-null-date-fix:verify` and wired it into local and Vercel release gates.

## v4.59.1 - Landlord Units Typecheck Fix

- Fixed the `/landlord/units` Prisma query type error caught by Vercel by typing the unit filter as `Prisma.UnitWhereInput`.
- Replaced raw unit status strings with `UnitStatus.ARCHIVED` and `UnitStatus.AVAILABLE` so Prisma enum inference stays valid during `next build`.
- Added `landlord-units-typecheck-fix:verify` and wired it into local and Vercel release gates.

## v4.59.0 - Final Readiness Layer

- Added shared `LoadingState` and `ErrorState` primitives, improved empty-state live regions, status aria labels, active-tab semantics, and focus-visible outlines for core shared UI actions.
- Hardened sample data safety by blocking production seeding unless `ALLOW_SAMPLE_DATA_IN_PRODUCTION=true` is intentionally set for a demo or sandbox environment.
- Expanded `/admin/system` with a sample-data guard check, workflow-proof shortcut, production-runbook guidance, and final-readiness verifier command.
- Added `docs/PRODUCTION_RUNBOOK.md`, `docs/FINAL_READINESS_LAYER.md`, and `final-readiness:verify`, then wired the verifier into local and Vercel release gates.

## v4.58.0 - Field Workflow Proof and Launch Hardening

- Upgraded `/admin/workflow-proof` into an operational field workflow proof center for tenant repair intake, landlord review, vendor assignment, vendor acceptance, mobile field updates, estimate/invoice handling, completion, payout readiness, inspection assignment, reports, and reinspections.
- Added `buildFieldWorkflowProofModel` with Prisma-backed repair and inspection chain counts so launch readiness displays real data with watch states instead of fake proof.
- Added a launch-hardening section that documents canonical conversations, field workflow proof coverage, release-gate wiring, and the no-fake-proof standard for first release.
- Added `docs/FIELD_WORKFLOW_PROOF_LAUNCH_HARDENING.md` and `field-workflow-proof-launch-hardening:verify`, then wired the verifier into local and Vercel release gates.

## v4.57.0 - Canonical Conversations and Workflow Proof

- Started the canonical conversation model migration with new `Conversation`, `ConversationParticipant`, and `ConversationEvent` schema/migration support while preserving legacy lead and message-thread records.
- Added canonical conversation normalization for leads, lead notes, and message threads, then surfaced `canonicalConversationId` through the unified landlord inbox adapter.
- Added `/admin/workflow-proof` with real maintenance, vendor, and inspector workflow proof counts linked back to source operational pages.
- Added `docs/CANONICAL_CONVERSATIONS_WORKFLOW_PROOF.md` and `canonical-conversations-workflow-proof:verify`, then wired the verifier into local and Vercel release gates.

## v4.56.0 - Marketplace Readiness and Unified Messaging Canonicalization

- Tightened public marketplace readiness with quality-gated active listings, capped search result loading, privacy-aware location labels, and no street-address keyword matching.
- Improved discovery recovery with removable no-results filter chips, area-only map-preview language, and saved-search deletion from applicant favorites.
- Canonicalized landlord messaging by making the older `landlord-unified-inbox` module a compatibility facade over the permission-scoped `unified-landlord-inbox` adapter.
- Added `docs/MARKETPLACE_READINESS_UNIFIED_MESSAGING.md` and `marketplace-readiness-messaging:verify`, then wired the verifier into local and Vercel release gates.

## v4.55.0 - Admin Operations Authority and Marketplace Discovery Polish

- Made admin navigation point primary platform operations into the command center for access requests, data quality, workflows, integrations, health, sample data, security, and audit logs.
- Added an authoritative operations directory to the Admin Command Center so admins can triage from one page before opening drilldowns or source tools.
- Polished marketplace production discovery with availability-date search, quick discovery shortcuts, clickable saved-search labels, and trust messaging for real listings, shareable search URLs, and fast apply.
- Added `docs/ADMIN_OPS_MARKETPLACE_DISCOVERY.md` and `admin-ops-marketplace-discovery:verify`, then wired the verifier into local and Vercel release gates.

## v4.54.0 - Mobile Flow QA and Admin Command Center Drilldowns

- Added `/admin/command-center/drilldowns` with focused real-record drilldowns for command-center data-quality, failed-integration, and blocked-workflow issues.
- Updated command-center issue cards to link into focused drilldowns before sending admins into broader source areas.
- Tightened phone layouts for marketplace listing detail, guided apply, landlord inbox, tenant directory, maintenance queue, vendor field jobs, and admin command-center audit panels.
- Added `docs/MOBILE_FLOW_ADMIN_DRILLDOWNS.md` and `mobile-flow-drilldowns:verify`, then wired the verifier into local and Vercel release gates.

## v4.53.0 - Tenant Portal Completion

- Replaced applicant-era tenant redirects with native tenant pages for lease, rent, maintenance, inbox, documents, notices, inspections, and ledger.
- Added resident lease packet routing under `/tenant/leases/[id]` so tenants can review and sign lease packets without leaving the tenant portal.
- Extended document and notice center routing to support `basePath="tenant"` and resident-safe acknowledgement/document links.
- Added `tenant-portal:verify` and wired it into local, no-migrate, and Vercel release gates so tenant routes cannot silently drift back to applicant screens.

## v4.52.0 - Property Manager Expanded Access Scoping

- Added scoped expanded-access rules so approved account access opens modules but record access still requires owner relationship, unit assignment, participant relationship, or role-specific active `ProfileConnection`.
- Added property manager, caseworker, maintenance/vendor, and inspector connection-role checks in central authorization helpers.
- Added direct unit staff assignment checks for property managers, caseworkers, and maintenance users.
- Added multi-owner authorization regression tests for connected property managers, unrelated owner denial, caseworker housing scope without ledger access, and inspector denial without assignment.
- Added expanded access scoping documentation and a release verifier.

## v4.51.0 - Environment Contract Hardening

- Added an environment contract document covering required database, auth, app URL, storage, email, cron, and Stripe deployment settings.
- Added `environment-contract:verify` to validate environment documentation, `.env.example`, runtime env warnings, Vercel preflight coverage, and release-gate wiring.
- Updated Vercel deployment documentation so it matches the current first-release, permission, authorization, protected-route, middleware, environment, payments, migration, and build gates.
- Removed duplicated `.env.example` assignments for Vercel strict mode and email batch size.
- Wired the environment contract verifier into local and Vercel release gates and bumped release metadata to 4.51.0.

## v4.50.0 - Middleware Static Matcher Hardening

- Changed middleware back to a build-safe static `config.matcher` literal while keeping the shared protected prefix manifest for runtime checks.
- Added `middleware-static:verify` to compare the middleware matcher literal with `PROTECTED_ROUTE_PREFIXES` and `PROTECTED_ROUTE_MATCHERS` so route protection cannot drift silently.
- Updated the protected route access manifest to document the Next/Vercel static matcher constraint.
- Wired the middleware static verifier into local and Vercel release gates.
- Updated release metadata to 4.50.0.

## v4.49.0 - Protected Route Access Manifest

- Added a shared protected route manifest consumed by middleware so private role workspaces stay in one auditable list.
- Expanded unauthenticated middleware protection to tenant, vendor, inspector, dashboard, and shared documents routes while preserving server-side role checks as the authorization source of truth.
- Tightened the applicant workspace layout from any signed-in user to applicant/tenant role access.
- Added `protected-routes:verify` and wired it into local and Vercel release gates.
- Documented the route access policy, role boundaries, and follow-up browser redirect tests.

## v4.48.0 - Runtime Authorization Regression Tests

- Added mocked Vitest coverage for the central authorization helpers so guessed-ID risks are tested at runtime, not only through static release markers.
- Covered cross-landlord application access, cross-applicant application access, private unit access, maintenance participant scope, message thread inheritance, lease signer access, hidden document guesses, denied-access audit logging, property-manager grants, and active profile connections.
- Added `authorization:runtime:test` and `authorization-runtime:verify` scripts, then wired the runtime verifier into the release gate.
- Updated the permission matrix with the new runtime coverage summary and bumped release metadata to 4.48.0.

## v4.47.0 - Permission Matrix & Guessed-ID Security Tests

- Added a first-release permission matrix for sensitive record families, high-risk routes, and guessed-ID test strategy.
- Added a `permission-matrix:verify` release gate that checks document downloads, private unit photos, sample-data export, workflow actions, applicant/landlord detail pages, cron routes, and webhooks for server-side authorization markers.
- Hardened the sample/demo data export route from general admin access to super-user-only access.
- Updated release metadata to 4.47.0.

## v4.46.2 - CI Verifier Drift Cleanup

- Updated remaining historical verifier scripts that referenced the removed `WorkhorseDashboard` so they validate the active `RoleDashboard`, first-release navigation, shared status badges, and Admin Command Center instead.
- Kept the Vercel build path on `first-release:verify` while preserving older verifier scripts as runnable compatibility checks.
- Updated release metadata to 4.46.2.

## v4.46.1 - Vercel First Release Build Gate Fix

- Updated `vercel-build` and `vercel-build:no-migrate` to run the current `first-release:verify` gate instead of the retired operational coherence verifier that expected `WorkhorseDashboard`.
- Updated the operational coherence verifier so it checks the active `RoleDashboard` and first-release build gate rather than the removed legacy dashboard.
- Updated release metadata to 4.46.1.

## v4.46.0 - First Release Codebase Readiness

- Centralized role navigation into a first-release pathway manifest so applicant, tenant, landlord, inspector, vendor, and admin shells share one route architecture.
- Removed the unused legacy `WorkhorseDashboard` component now that role dashboards are the active dashboard system.
- Replaced the historical all-up update verifier chain with a focused first-release verification gate.
- Strengthened nonpublic unit photo access by reusing central `canAccessUnit` authorization instead of a one-off owner check.
- Added first-release permission helpers for listing, lead, and admin operations access.
- Removed generated TypeScript build metadata from the package tree and added the first-release audit document.

## v4.45.0 - Workflow Polish & QA Pass

- Added shared workflow polish primitives for consistent status labels, status badges, page headers, empty states, and first-run checklists.
- Tightened marketplace search language around saved searches, filter clearing, no-results recovery, and broader-match actions.
- Clarified applicant submission, landlord tenant-directory actions, maintenance queue actions, dashboard next-action labels, and empty activity copy.
- Reused shared empty states and status badges in tenant search and maintenance workflows so labels and next steps feel consistent.
- Added release documentation and a focused verifier for the workflow polish QA pass.

## v4.44.0 - Admin Command Center & Super User

- Upgraded `/admin` into a real platform operations command center with access requests, data quality, failed integrations, blocked workflows, sample-data safety, production health, security signals, audit activity, and quick actions.
- Added `AccountAccessType.SUPER_USER` plus a migration and server-side permission helpers for super-user-only operations.
- Added a protected `/admin/command-center` route that requires super-user access while keeping `/admin` useful for normal admin visibility.
- Enforced super-user review for elevated `ADMIN` and `SUPER_USER` access requests in the existing access review action.
- Added real data builders for quality checks, workflow blockers, integration failures, sample-data detection, elevated users, and production readiness labels without exposing secrets or fake metrics.
- Updated admin navigation, release documentation, and verification markers for the new operations architecture.

## v4.43.0 - Unified Messaging & Lead Inbox

- Rebuilt `/landlord/inbox` into a unified communication center with lead questions, application conversations, maintenance threads, context cards, filters, search, metrics, and one reply composer.
- Added a server-side `UnifiedInboxThread` adapter that normalizes `Lead`, `LeadNote`, `MessageThread`, and `Message` records without a destructive database migration.
- Preserved existing authorization by scoping leads and message threads to landlord-owned or property-managed units and keeping reply actions server-protected.
- Updated lead replies so landlords can answer from the unified inbox and return to the selected conversation after sending.
- Pointed landlord dashboard lead questions into the unified inbox instead of splitting reply work across separate lead and message surfaces.
- Documented the adapter strategy, unified sources, permission model, and remaining migration steps.
- Added a focused verifier for the unified messaging and lead inbox release.

## v4.42.0 - Marketplace Map/List Experience

- Added a URL-backed marketplace view toggle for `Map preview` and `List`.
- Added a sticky desktop location preview panel and mobile location drawer that group real filtered listings by city, ZIP, and neighborhood.
- Added area count bubbles, area summary actions, and sample listing cards that preserve Marketplace Search v2 filters and sorting.
- Kept the implementation honest because the current schema has addresses but no latitude/longitude or map provider dependency.
- Documented the future full-map path: geocoded coordinates, address visibility controls, audited backfill, and a client-only map provider.
- Added release documentation and a focused verifier for the map/list experience.

## v4.41.0 - Marketplace Search v2

- Added user-scoped saved marketplace searches with a new `SavedMarketplaceSearch` model and applicant saved-search display.
- Added `Unit.availableOn`, landlord availability inputs, listing availability badges, and server-side availability filters.
- Upgraded marketplace filters with mobile drawer controls, active filter chips, individual clear links, availability date filtering, and stronger sort options.
- Added signed-in save-search actions and guest sign-in prompts while keeping search state URL-driven.
- Rebuilt the no-results state with recovery actions and real broader-match listing fallbacks instead of a dead end.
- Added release documentation and a focused verifier for Marketplace Search v2.

## v4.40.0 - Applicant Journey Simplification

- Added a guided apply route at `/applicant/apply/[unitId]` so signed-in applicants can review their reusable packet before authorizing profile sharing.
- Added reusable packet readiness logic for identity, address, household, income, rental history, structured details, signature, and reusable documents.
- Updated marketplace signed-in apply CTAs to emphasize "Review packet and apply" while keeping a compact one-click authorization form available.
- Redirected marketplace application submission back to the applications list with a clear confirmation and direct detail link.
- Added release documentation and a focused verifier for the simplified applicant journey.

## v4.39.0 - Dedicated Tenant Portal

- Added a first-class protected `/tenant` dashboard route for residents instead of sending tenant users back to the applicant home.
- Added a resident-focused tenant dashboard shell with rent, lease, maintenance, notices, inspections, documents, messages, ledger, tasks, and calendar navigation.
- Updated role-dashboard module home and tenant next-action links so tenant work points to `/tenant/...` URLs.
- Added protected tenant workflow redirect routes that preserve the existing applicant-backed resident screens while establishing stable tenant URLs.
- Added release documentation and a focused verifier for the dedicated tenant portal.

## v4.38.0 - Role Clarity Next Action System

- Added a role clarity layer to the shared dashboard model so every account type gets a clear role goal, current focus, primary next action, and follow-up actions.
- Upgraded the shared role dashboard with a prominent "You are here" and "Do this next" section before the needs-attention queue.
- Derived next actions from real needs-attention data first, then safe role empty states and authorized tools, avoiding fake work items.
- Surfaced authorized modules directly in the dashboard clarity panel so users understand which workflows their role and approved access can use.
- Added release documentation and a focused verifier for the role clarity and next action system.

## v4.37.0 - Enterprise Public Homepage

- Rebuilt the public homepage into an enterprise-grade housing marketplace and rental operations landing page.
- Added a strong hero, rental search module, renter/landlord/housing-team/vendor pathways, platform ecosystem section, product preview, live featured listings, trust/security section, and final CTA.
- Removed demo fallback listings and fake homepage metrics; the page now uses live marketplace data when available and honest empty/unavailable states when it is not.
- Connected homepage search fields to the real `/marketplace` query parameters, including city, bedrooms, rent range, and voucher-friendly filtering.
- Added release documentation and a focused verifier for homepage structure, live-data behavior, and version metadata.

## v4.36.0 - Role-Based Dashboard System

- Added a server-side role dashboard architecture that resolves dashboard modules from `UserRole` plus approved `AccountAccessRequest` records.
- Added a smart `/dashboard` entry point that renders the correct role-based dashboard for the signed-in account without exposing unauthorized modules.
- Added shared dashboard builders, permission helpers, reusable metric cards, task lists, tool grids, activity feed, and role dashboard UI components.
- Added an inspector dashboard route with assigned inspection metrics, needs-attention work, report/reinspection signals, and protected inspector navigation.
- Reworked admin and vendor dashboard landing pages to use the new role dashboard model while keeping existing protected admin/vendor subroutes intact.
- Added role-aware navigation entry points and release verification for dashboard permissions, routes, and UI markers.

## v4.35.0 - Landlord Tenant Directory

- Added a landlord-facing Tenant Directory at `/landlord/tenants` for applicants, leads, current tenants, and past tenants connected to the landlord's own units.
- Added server-scoped tenant visibility so directory and detail records are only loaded through applications, leads, occupancies, and units owned by the signed-in landlord.
- Added marketplace CRM search, filters, sorting, pagination, metrics, badges, empty states, and quick actions for profile review, applications, messages, and lead replies.
- Added privacy-aware tenant detail views with locked reusable profile states until an applicant has applied or authorized profile sharing.
- Connected visible reusable profile, application detail, household, income, vehicle, voucher, document, unit, and message context into one landlord detail screen.
- Added release documentation and a tenant directory verifier.

## v4.34.0 - Landlord Dashboard Control Center

- Rebuilt the landlord homepage into a purpose-built operating console instead of the shared generic dashboard.
- Added high-priority sections for needs attention, recent messages/questions, applications pipeline, property/unit health, units needing action, task/lease work, and maintenance.
- Surfaced applicant questions, unread message indicators, application packet authorization status, listing gaps, property vacancy, and next best actions directly on the dashboard.
- Replaced the landlord applications table with a packet review queue that shows applicant authorization, household/income/document signals, unit context, message reply links, and next action guidance.
- Added rental search and status/listing filters so landlords can find properties and units across larger portfolios.
- Added stronger empty states, quick actions, mobile-friendly cards, clearer badges, and denser decision-oriented metrics for daily landlord work.
- Added release documentation and a dashboard control-center verifier.

## v4.33.0 - Applicant Packet Fields & Tenant Visibility

- Added structured driver license state/number, vehicle, license plate, and housing agency/case worker fields to reusable applicant profiles and application details.
- Replaced vague ID, case worker, and vehicle inputs with dropdowns and grouped operational sections.
- Added visible applicant profile save confirmation, application detail save confirmation, and post-submit redirect to the applications list with a submitted banner.
- Kept the first auto-apply confirmation screen focused by hiding the Phase 2 form when the applicant has just applied from a listing.
- Expanded the landlord application detail page so landlords can see the submitted applicant packet, household, income, vehicle, voucher, disclosures, and profile details.
- Added a landlord Tenants screen and tenant detail page to view renter, occupancy, unit, application packet, household, income, lease, and document context in one place.

## v4.32.0 - Reusable Auto-Apply Profile Packet

- Expanded the applicant reusable profile to store Phase 2 application details, emergency contact, housing history, voucher/caseworker, vehicle, accommodation, disclosure, and certification fields.
- Added the reusable application packet section to the applicant profile page with saved signature status.
- Updated marketplace fast apply to share the full saved renter packet and show whether the reusable packet is signed.
- Updated auto-apply creation so new applications inherit the saved Phase 2 details and acknowledgements from the applicant profile.
- Synced application detail saves back into the reusable profile so applicants only need to complete the structured details once.
- Added a Prisma migration for the reusable application packet profile fields.

## v4.31.0 - Marketplace Application & Lead Reply UX

- Added signed-in marketplace fast apply so applicants can authorize sharing their saved renter packet from the listing page.
- Replaced the public inquiry form for signed-in applicants with a compact apply path, optional applicant note, saved-rental note, and lightweight question flow.
- Added landlord lead replies from the lead detail page, including email delivery through the existing provider helper, lead status updates, audit logging, and timeline notes.
- Fixed the marketplace sign-in path to use the app's `/login` route and kept the full public lead form for guest visitors.
- Added release documentation and a focused verifier for marketplace application and lead reply UX markers.

## v4.30.2 - Vercel Migration Runner Typecheck Fix

- Fixed TypeScript validation for the Vercel automatic migration runner by removing generic type arguments from dynamically typed Prisma raw query calls.
- Preserved the existing Neon baseline reconciliation flow added in v4.30.1.
- Keeps automatic production migrations enabled while allowing Next.js type checking to pass.

## v4.30.1 - Existing Neon Baseline Migration Reconciliation

- Hardened the Vercel automatic migration runner for existing Neon databases that already contain app tables and enums.
- Detects failed or missing squashed baseline migration history before running `prisma migrate deploy`.
- Reconciles the live Neon schema with `prisma db push --skip-generate`, then marks current migrations as applied so future deployments can use normal migration deploy behavior.
- Prevents the squashed baseline from attempting to recreate existing PostgreSQL enum types such as `UserRole`.

## v4.30.0 - Vercel Automatic Prisma Migrations

- Added a Vercel production migration runner that runs before `next build` so Neon schema changes are applied automatically during production deployment.
- Added a one-time existing-database baseline path for Neon databases that already have app tables but no Prisma migration history, preventing the squashed clean-install migration from trying to recreate existing tables.
- Added migration controls: `VERCEL_RUN_MIGRATIONS=1` to force migration execution and `VERCEL_SKIP_MIGRATIONS=1` to skip during an emergency deploy.
- Updated Vercel preflight checks, package scripts, README, and environment examples to document the automated migration flow.

## v4.29.0 - Rental Application Staff Review Phase 3

- Added a Phase 3 staff review engine for rental applications with approval blockers, review warnings, next-best-action guidance, and structured decision readiness.
- Added automatic recommended document requests based on application details, income, voucher/subsidy status, pets or assistance animal details, and utility balance disclosures.
- Added a staff review panel to the admin application detail page with a checklist, applicant readiness score, document automation, and final decision form.
- Hardened approval so applications cannot be approved and converted to tenant access until required review conditions are complete.
- Preserved the existing database schema for this phase by storing review actions in application notes and document request records.

## v4.28.0 - Rental Application Structured Details Phase 2

- Added the ApplicationDetail data model and migration for structured rental application fields.
- Added applicant-facing application details, housing history, voucher, vehicle, pet, disclosure, and certification sections.
- Added server action validation and persistence for structured application details without storing them in the application summary.
- Updated application readiness scoring so structured details and screening acknowledgements are required before submission.
- Added admin review visibility for the new structured application details and acknowledgements.

## v4.27.0 - Applicant Application Readiness Phase 1

- Added a reusable applicant application readiness engine that scores profile, contact, address, household, income, rental history, landlord references, requested documents, move-in timing, and applicant notes.
- Added a readiness checklist and progress meter to the applicant application detail page so applicants can see exactly what is complete and what still needs attention.
- Strengthened applicant submission validation so applications cannot be submitted until all required readiness items are complete.
- Enhanced the applications list with per-application readiness progress, next-step guidance, and clearer submission readiness signals.

## v4.26.3 - Inbox Type and Release Label Fix

- Fixed the admin inbox thread typing so maintenance requests and application records can safely handle nullable related units returned by Prisma.
- Added the missing `APP_RELEASE_LABEL` export used by the layout, footer, admin system page, and admin operations helpers.
- Kept the clean-install guard active and synchronized README, app version, package metadata, and changelog release notes.

## v4.26.2 - Landlord Unit JSX Compile Fix

- Fixed the landlord unit detail page compile error by closing the Pipeline panel before the next layout section.
- Confirmed the clean-install, operational coherence, and payments production checks continue to pass before Prisma binary download.

## v4.26.1 - Vercel Clean Install Release Fix

- Fixed `payments-production:verify` so it validates the active package version instead of requiring the historical `4.21.0` package version.
- Confirmed the clean-install package ships only the squashed operational foundation baseline and post-baseline migrations.
- Kept the Vercel clean-install guard intact so legacy migration recovery scripts and pre-baseline development migrations still fail the build if they reappear.

## v4.26.0 - Reporting & Analytics v1

- Expanded the reports suite into first-class analytics sections for occupancy, delinquency, cash flow, lead conversion, application funnel, maintenance cost, vendor performance, and inspection compliance.
- Added scoped drilldown pages for admin and landlord reports that render the same table data used by CSV/JSON exports.
- Added property filtering, report drilldown actions, and export-ready tables for finance, leasing, maintenance, vendor, and compliance operations.
- Extended the Prisma-backed reports service with delinquency ledgers, cash movement, lead/application funnel rows, vendor invoice/payout analytics, and inspection compliance risk.
- Added release documentation and focused verification for Reporting & Analytics v1.

## v4.25.0 - Integrations v1 Real Connections

- Added the first real connection layer for Stripe, SendGrid/Postmark email, and QuickBooks with OAuth, webhook, token lifecycle metadata, retryable events, and diagnostics.
- Added QuickBooks OAuth start/callback routes with state validation, owner-aware start access, realm capture, and external-token lifecycle metadata.
- Added provider webhook endpoints for QuickBooks and email delivery events, plus Stripe webhook integration event logging around the existing payment processor.
- Extended the integrations control center with Real v1 badges, live connection cards, webhook paths, OAuth actions, retry counts, webhook/OAuth/sync log counters, and real provider diagnostics.
- Added release documentation and focused verification for Integrations v1 Real Connections.

## v4.24.0 - Real Maintenance/Vendor Operations

- Added maintenance assignment queues, vendor acceptance, SLA risk tracking, and recurring maintenance scheduling to landlord/vendor operations.
- Added mobile field mode for vendors with job acceptance, work logs, photo uploads, estimates, invoices, and payout eligibility visibility.
- Added landlord maintenance metrics for unassigned work, vendor acceptance, SLA risk, submitted estimates, and preventive maintenance tasks.
- Extended vendor data helpers and server actions for field photos, estimates, accepted jobs, payout-ready invoices, and recurring maintenance tasks.
- Added release documentation and focused verification for the real maintenance/vendor operations workflow.

## v4.23.0 - Landlord Operating Console

- Turned each landlord rental detail page into a true operating console with listing health, command links, attention items, lead/application pipeline, tenant state, lease/rent/deposit, ledger, maintenance, contacts, inspections, documents, notes, and timeline.
- Added listing-health scoring for photos, marketing copy, pricing, terms, location context, and contacts.
- Added rental timeline synthesis across leads, applications, lease packets, ledger entries, maintenance requests, inspections, and documents.
- Added release documentation and focused verification for the landlord operating console surface.

## v4.22.0 - Applicant/Tenant Experience Upgrade

- Rebuilt the applicant dashboard as a guided housing journey with profile completeness, saved searches, application packet reuse, move-in readiness, rent setup, utilities, maintenance, documents, and messages.
- Added tenant journey rails for move-in checklist progress, rent calendar, utilities, maintenance, document, and messaging workflows above the existing tenant home dashboard.
- Added focused release documentation and verification coverage for the applicant/tenant experience upgrade.

## v4.21.0 - Payments Production Hardening

- Added durable Stripe webhook idempotency logs with replay-safe processing status tracking.
- Centralized payment reconciliation for Checkout Sessions, PaymentIntents, refunds, disputes, transfers, payouts, and Stripe account updates.
- Added Stripe receipt URL/number and refund status tracking on ledger entries.
- Hardened failed-payment recovery by pausing autopay after exhausted retry cycles.
- Added a landlord payment reconciliation view for receipts, failed payments, autopay health, disputes, refunds, payout status, and ledger gaps.
- Added `payments-production:verify`, documentation, migration coverage, and workflow matrix coverage for the new reconciliation surface.

## v4.20.1 - Vercel Lockfile Fix

- Rewrote package-lock tarball URLs to the public npm registry so Vercel can install dependencies outside the local build mirror.
- Added `.npmrc`, `packageManager`, Node engine pinning, `lockfile:verify`, and Vercel/CI lockfile checks.

## v4.20.0 - Unified Rental Lifecycle Engine

- Added a shared rental lifecycle engine that derives one operating status from unit, lead, application, lease, occupancy, notice, maintenance, and listing readiness signals.
- Added landlord and admin lifecycle boards for portfolio-level visibility across setup, market, lease, resident, exit, and hold lanes.
- Added lifecycle recommendation and confidence signals to landlord rental cards.
- Added a unified lifecycle panel and manual lifecycle override to the landlord rental detail page.
- Centralized lifecycle-to-unit-status mapping for landlord lifecycle actions.
- Added `rental-lifecycle:verify`, docs, and E2E route coverage for the new lifecycle surfaces.

## v4.19.0 - Workflow Readiness Center

- Added an admin workflow readiness center at `/admin/workflows` to score each core product promise as proven, covered, basic, or underdeveloped.
- Added a shared workflow readiness registry for public discovery, applicant, landlord, maintenance, messaging, leases, finance, admin governance, vendor, and mobile field-work workflows.
- Linked workflow readiness from the admin sidebar and operations control center.
- Extended the workflow E2E matrix to include the new readiness surface.
- Added `workflow-readiness:verify` and documentation so future updates can be judged by workflow maturity, not feature count.

## v4.18.0 - End-to-End Workflow QA Release

- Added a deterministic Playwright workflow matrix for marketplace inquiry, applicant packet, landlord operations, maintenance, messaging, admin governance, and payment surfaces.
- Added shared E2E helpers that assert pages do not silently render Prisma or Next.js runtime failures.
- Expanded seed data with an occupied tenant unit, maintenance request, linked message thread, message, and operations task.
- Added `workflow-qa:verify`, `test:e2e:workflow`, CI workflow coverage, and workflow QA documentation.

## v4.17.1 - Clean Foundation Hardening

- Replaced the mixed historical migration chain with a clean baseline migration plus post-baseline migrations for fresh installs.
- Updated Vercel and clean-install verification to match the no-legacy-data deployment strategy.
- Synchronized package, lockfile, README, and runtime app version metadata.
- Hardened landlord unit photo validation before record creation to avoid partial listings after failed uploads.
- Added payment-method verification checks before scheduled payments and autopay enrollment.
- Strengthened CI to use lockfile installs and run verification/build gates.

## v4.16.0 - Operational Coherence

- Added a shared dashboard coherence DTO/builder so dashboards consistently surface today's work, inbox, rental records, money, and recent activity.
- Added the operating cockpit and next-best-action panel to the Workhorse dashboard used across account types.
- Made message thread context links workspace-aware for admin, landlord, and applicant users.
- Added rental-record links to the messaging surface when a thread is tied to a rental.
- Added operational coherence documentation and verification coverage wired into Vercel build scripts.

## v4.15.4 - Clean Install Hardening

- Removed legacy migration-recovery build steps and the no-op compatibility migration because this package targets fresh installs only.
- Added a clean-install verification script for release metadata, dynamic database pages, migration shape, and text encoding checks.
- Fixed the README version, tightened exact `DATABASE_URL` / `DIRECT_URL` guidance, and updated Vercel deployment docs.
- Marked all newly detected database-backed notice/contact pages as force-dynamic and normalized visible option separators.

## 4.15.3 — Prisma Occupancy Unit Relation Fix

- Added the missing `Unit.occupancies` opposite relation for `Occupancy.unit`.
- Bumped the package version to `4.15.3`.
- Addresses Vercel Prisma P1012 validation failure during `prisma generate`.


## v4.15.1 - Vendor Invitation Onboarding

- Added pending vendor invitations for vendors who do not have accounts yet.
- Added secure vendor signup links that automatically activate vendor account type and portal access.
- Added email invite sending/logging and pending invitation display in the vendor directory.
- Added migration and verification script for the vendor invitation workflow.


## 4.14.3 — Package cleanup and optimization

- Removed the generated TypeScript incremental cache file from the shipped package.
- Expanded `.gitignore` for Next.js, TypeScript, dependency, coverage, local env, log, and upload artifacts.
- Added `npm run package:cleanliness` to prevent generated/cache files from re-entering the package.
- Documented optimization findings and future file-splitting opportunities.


## 4.12.6 - Applicant calendar type fix

- Fixed the applicant calendar build failure caused by an untyped empty users list being inferred as `never[]`.
- Kept the applicant calendar read-only for user selection while preserving property, unit, and task context.

## v4.12.5

- Fixed admin notifications signature queue to use `SignatureRequest.signerRole` instead of removed `role` property.

## v4.12.1 - Prisma relation validation fix

- Added missing `MaintenanceRequest.vendorWorkLogs` and `MaintenanceRequest.vendorInvoices` opposite relation fields.
- Removed invalid `LedgerEntry.vendorProfiles` and `LedgerEntry.vendorInvoices` relation arrays that had no foreign-key counterpart.
- This patch targets the Prisma P1012 validation failure reported during Vercel postinstall.


## v4.11.0 - Insurance / Compliance Module

- Added functional admin and landlord compliance pages for update 11.
- Added insurance policy create workflow for renters, landlord, liability, flood, umbrella, and other policy types.
- Added certification expiration tracking and recurring inspection compliance rule creation.
- Added landlord portfolio access checks for compliance records.
- Added update 11 verification script and module documentation.

## v4.9.0 — Operations Modules Updates 9-12

- Added Applicant Screening module for background checks, income verification, rental history, references, and screening packages.
- Added Maintenance Inventory module for appliances, HVAC, keys, locks, warranties, serial numbers, and service history.
- Added Insurance / Compliance module for renters insurance, landlord insurance docs, inspection compliance, and certification expirations.
- Added Integrations Hub for Stripe, Plaid, Twilio, SendGrid/Postmark, S3/R2, QuickBooks, Google Calendar, maps, and screening providers.
- Added Prisma schema, migration, admin/landlord navigation, dashboard query helpers, shared operations UI, docs, and verification coverage.

## v4.7.0 — Vendor Portal Module

- Added dedicated vendor portal routes for assigned jobs, work updates, invoices, and payout visibility.
- Added admin and landlord vendor operations pages for enabling vendors, assigning repair work, reviewing invoices, and preparing payouts.
- Added VendorProfile, VendorWorkLog, and VendorInvoice schema models with migration.
- Added vendor access wiring through approved Vendor account access and Preferred Vendor profile connections.
- Added vendor directory metrics, invoice review workflow, work-log status updates, and backup/export coverage.
- Added admin and landlord navigation entries for Vendors.


## v4.6.0 - Notices Module

- Added the Formal Notices module for rent reminders, late notices, entry notices, lease renewal/non-renewal notices, maintenance notices, policy notices, move-out notices, and general formal communications.
- Added Prisma notice enums, FormalNotice model, relations to users/properties/rentals/applications/lease packets, and migration coverage.
- Added admin, landlord, and applicant notice centers with metrics, filters, creation workflow, send/draft/acknowledge/cancel/expire statuses, and dense notice rows.
- Added server actions for notice creation/status updates, recipient inference from rentals/applications/leases, notification delivery queue integration, audit logging, and dashboard revalidation.
- Added notice backup/export coverage and navigation links across admin, landlord, and applicant dashboards.

## v4.5.0 - Real Reports & Analytics Suite

- Added real admin and landlord Reports routes with financial, occupancy, leasing, maintenance, and communications sections.
- Added `src/lib/reports` service layer with Prisma-backed KPI aggregation, scoped landlord/admin filters, date ranges, property/rental filters, and DTO output.
- Added CSV and JSON export routes for report sections.
- Added dense report dashboard UI with metrics, trend bars, status breakdowns, and compact report tables.
- Wired Reports into admin and landlord financial navigation from the v4.4.0 Calendar/Scheduling baseline.


## v4.4.0 - Calendar / Scheduling Module

- Added a unified Calendar / Scheduling module for admin, landlord, and applicant dashboards.
- Added schedule event models, participants, lifecycle statuses, visibility controls, and task-to-calendar linking.
- Added schedule filters, dense event rows, metrics, status updates, assignment controls, and renter-visible calendar views.
- Added migration coverage and dashboard navigation links for tours, inspections, maintenance windows, lease signings, move-ins, rent deadlines, and renewals.

# 4.3.0 - Tasks & Work Orders Module

- Added universal `TaskItem` schema for tasks, work orders, leasing follow-up, document chases, move-ins, move-outs, collections, vendor work, and maintenance coordination.
- Added admin, landlord, and applicant task centers with compact filters, metrics, assignment controls, status updates, and operational context links.
- Added task/work-order navigation across dashboards and backup/export coverage.
- Added migration `20260518130000_tasks_work_orders`.

## v4.0.1 - Marketplace build fix

## v4.1.0 - Notifications Center Module

- Added a generalized Notifications Center module with in-app, email, and SMS-ready channels.
- Added notification templates, per-user preferences, delivery logs, queue processing, and broadcast alerts.
- Added landlord and applicant notification inboxes with read/dismiss actions and preference controls.
- Expanded admin notifications into a unified center while preserving lease signature notification workflows.
- Added Prisma schema, migration, backup/export coverage, and cron processing for generic notification deliveries.


- Fixed the marketplace route build failure by restoring safe query-param helper functions for string cleaning and numeric parsing.
- Preserved the v4.0.0 rental profile ecosystem work while making the public marketplace page compile cleanly on Vercel.

## v4.0.0 - Rental Profile Ecosystem Rebuild

- Rebuilt the public rental profile around a premium, photo-first real-estate layout with immersive hero gallery, thumbnail grid, true photo counts, compact facts, monthly/move-in cost estimates, map link, and sticky mobile apply/contact actions.
- Added the rental profile domain helper layer for lifecycle labels, health scoring, derived lifecycle states, and timeline assembly so rental pages use shared business logic instead of scattered page calculations.
- Expanded rental lifecycle support with Draft, Coming Soon, Active, Lead Activity, Application Pending, Lease Pending, Move-In Scheduled, Occupied, Renewal Pending, Notice Given, Turnover, Maintenance Hold, and Archived states.
- Reworked the owner rental profile into a denser operational surface with media management, compact summary metrics, tenant assignment workflow, lease/ledger/maintenance/message panels, staff/contact context, and reduced whitespace.
- Added rental profile migration support for lifecycle state persistence and aligned marketplace/detail terminology around Rentals rather than Units where public-facing.
- Improved mobile rental profile compression and marketplace/profile visual consistency for Vercel-safe server rendering.

## v3.9.2 - Marketplace professionalization

- Added a shared marketplace listing service and RentalListingDTO layer to keep marketplace query logic out of page components.
- Replaced query-heavy marketplace rent statistics with aggregate-backed marketplace metrics and capped city discovery queries for better Vercel performance.
- Added true listing photo counts, listing quality scoring, and applicant-only favorite controls with sign-in prompts for public visitors.
- Rebuilt the rental detail page into a premium real-estate layout with a large gallery hero, compact property facts, monthly/move-in cost estimates, map link, sticky mobile contact bar, and tighter information density.
- Expanded public inquiry capture with request type, move-in date, household size, and pet notes while preserving the existing lead schema by appending details into the lead message.
- Improved marketplace terminology so public pages read as Rentals instead of leaking older Unit language.

# v3.9.1 - Marketplace Density & Real Estate Polish

- Reworked the public marketplace into a wider, denser real-estate browsing surface with a sticky result summary bar, compact filters, and a four-column desktop grid.
- Rebuilt rental cards to show more listings above the fold while preserving large photo-first presentation, gallery counts, fit badges, address, rent, deposit, bedroom/bath/square-foot facts, and high-value feature chips.
- Tightened marketplace whitespace, reduced card and filter padding, added cleaner blue/slate marketplace styling, and improved focus/hover states for renter browsing.
- Added average rent and pet-note inventory stats while keeping live database-backed inventory metrics and safe empty-state behavior.
- Kept Vercel-safe server rendering: no client-only browser APIs, no local filesystem assumptions, and no synchronous marketplace side effects.

# v3.9.0 - Rental Ecosystem Rebuild

- Added the rental ecosystem data layer with rental type, marketplace marketing status, listing headline/highlights, tour links, and walk/transit scoring fields on rentals.
- Rebranded admin and landlord inventory navigation around Rentals while preserving the existing property/unit database hierarchy for backward compatibility.
- Added `/admin/rentals` and `/landlord/rentals` entry points so users can manage houses, duplexes, apartments, condos, rooms, and other rental types from a simpler workflow.
- Upgraded marketplace search with rental-type filtering, active marketing status filtering, larger photo-forward listing cards, dense listing facts, walk/transit metadata, and stronger real-estate presentation.
- Updated rental detail pages with marketing headlines/highlights, tour information, and marketplace-ready rental language.
- Added global scroll reset behavior to prevent post-login dashboard redirects from restoring users to the bottom of the page.
- Set HomeBase platform application fees to default to 0.1% for Stripe Connect checkout, scheduled payments, and retry flows through the shared Stripe fee helper.
- Expanded lease UX with a visible lifecycle engine panel that clarifies draft, review, signature, completion, and renewal/archive workflow stages.

# v3.8.0 - Operational Intelligence Platform

- Added admin operations control center with deployment readiness checks, system health snapshots, operational alerts, queue monitoring, and automation rule scaffolding.
- Added Prisma models and migration for AdminSystemHealthSnapshot, AdminOperationalAlert, AdminQueueJob, and AdminAutomationRule.
- Added admin actions to sync readiness alerts, capture health snapshots, and seed automation scaffolds.
- Expanded backup/export coverage to include the newer payment, autopay, dispute, vendor payout, escrow, accounting, credit reporting, financial insight, and admin operations models.
- Fixed backup/import upload forms with multipart encoding and safer redirect behavior from backup recovery imports.
- Added operations navigation to the admin shell and linked the operations center from the dashboard and system pages.

# 3.7.0 - Admin Operations Studio

- Added Admin Branding Studio with product identity, logo text, homepage copy, colors, support contact, theme mode, and launch toggles.
- Added Backup & Recovery Center with downloadable JSON backups, checksum manifests, recent backup history, and recovery import workflow.
- Added Admin Analytics Hub with operating metrics, workflow load, risk index, captured snapshots, and export shortcuts.
- Added Prisma models and migration for admin branding settings, backup manifests, and analytics snapshots.
- Updated data portability to include the new admin governance records.
- Reworked dashboard quick links from a horizontal scrolling rail into a responsive grid for a cleaner admin experience.
- Wired public homepage hero copy to branding settings while preserving live marketplace metrics.

## v3.6.2 - Branded Public Homepage Refresh

- Restyled the public homepage around the unified HomeBase Housing OS identity with a darker premium hero, electric-blue primary CTA system, and tighter slate/blue/emerald semantic palette.
- Replaced the generic public nav logo with the shared HomeBase brand mark/wordmark so the marketing site, dashboard shell, favicon, and app identity stay aligned.
- Upgraded the live homepage metrics into branded dark cards while preserving the v3.6.1 database-backed realtime counts and safe demo fallbacks.
- Polished the marketplace, workflow, trust, and CTA sections to feel more enterprise-grade and consistent with the v3.5 product identity system.

## v3.6.1 - Realtime Homepage Metrics

- Replaced hardcoded homepage stat cards with live database-backed counts for active listings, active applications, today’s inspections, and posted rent payments.
- Added safe demo fallbacks so fresh installs and unavailable databases still render the public homepage cleanly.
- Kept the homepage dynamic/no-store so public-facing metrics stay current on Vercel.

# 3.3.1 - Financial Automation & Recovery

## v3.5.5 - Payments Form Action Hotfix

- Fixed `refreshStripeConnectStatus` so it redirects instead of returning an object from a `<form action>`.
- Added landlord payment status query banners for missing and refreshed Stripe account states.

## v3.5.4 - Dashboard Shell Type Hotfix

- Fixed the shared dashboard shell navigation icon type to use Lucide's native `LucideIcon` type.
- Cleared the Vercel `admin/layout.tsx` TypeScript failure caused by narrowing icon `size` to only `number`.

## v3.5.3 - Vercel Migration Recovery Hotfix

- Added a narrow Vercel migration recovery script for the known failed `20260518000100_financial_automation_recovery` record.
- Updated the Vercel build command so the failed migration record is rolled back before `prisma migrate deploy` runs.
- Reintroduced the old failed migration name as a no-op compatibility migration so Prisma can resolve and pass through existing Neon migration history safely.
- Hardened the replacement financial automation migration so already-created enum types from the failed attempt do not break the next deploy.
- Tightened Vercel preflight to require actual `DATABASE_URL` and `DIRECT_URL` variables because the Prisma schema reads those exact names.

## v3.5.2 - Migration Order Hotfix

- Moved the financial automation recovery migration after the rental payment operations migration so `PaymentEventType` exists before the migration alters it.
- Added a migration-order verification guard to catch this dependency before deployment.

## v3.5.1 - Prisma Relation Hotfix

- Fixed Prisma schema validation failure by completing the `Application` to `VendorPayout` relation.
- Added `VendorPayout.applicationId`, relation wiring, index, foreign key, and migration for clean Vercel install.

## v3.5.0 - Unified Product Identity & UX System

- Repositioned HomeBase as a premium housing operations platform with updated product metadata and README language.
- Added a geometric HomeBase H mark, shared wordmark component, SVG favicon, and SVG app icon.
- Added global design tokens for the slate/blue/green/amber/red semantic color system and density variables.
- Added the shared `src/components/ui/system/` layer with cards, metrics, compact tables, badges, section headers, action bars, empty states, timelines, drawer panels, quick actions, data grids, tabs, and command palette scaffolding.
- Added a grouped dashboard shell with sidebar modules, sticky operational topbar, mobile navigation strip, search affordance, quick create entry, and command palette surface.
- Migrated admin, landlord, and applicant layouts onto grouped Operations, Leasing, Financial, Maintenance, Communication, and Administration navigation.
- Added DTO foundation folders for dashboard, financial, and messaging surfaces.
- Added product identity documentation and a static verifier for the new UX foundation.

## v3.4.1 - Payment Reliability & UX Cleanup

- Hardened Stripe Checkout, Connect onboarding, off-session PaymentIntent, and refund calls with idempotency keys.
- Let Stripe Checkout use dashboard-managed dynamic payment methods instead of forcing card-only flows.
- Stopped scheduled payment and retry jobs from marking ledger charges as paid until Stripe returns a succeeded PaymentIntent.
- Added PaymentIntent success/failure webhook reconciliation for scheduled payments and retry attempts.
- Cleaned visible payment-screen encoding artifacts and accidental extra vertical gaps.

## v3.4.0 - Enterprise Financial Ecosystem

- Added landlord enterprise finance workspace for disputes, vendor payouts, security deposits, accounting exports, credit reporting readiness, and portfolio risk insights.
- Added Prisma models and migration for PaymentDispute, VendorPayout, SecurityDepositAccount, AccountingExport, CreditReportingRecord, and FinancialInsightSnapshot.
- Added enterprise finance actions for vendor payout approval, deposit reconciliation, accounting export records, credit reporting record generation, and risk insight refresh.
- Linked the main payments command center to the advanced enterprise finance page.
- Hardened schema relations and build-safe enum handling for Vercel.


- Added full autopay enrollment records with pause, resume, cancellation, amount caps, backup methods, next-run tracking, and tenant controls.
- Added monthly rent generation from unit rent billing policies with duplicate-period protection and payment timeline events.
- Added failed-payment recovery with retry attempts, retry queue visibility, automatic retry scheduling, and Stripe off-session processing.
- Added refund and financial adjustment workflows with audit-friendly reasons, ledger credits/adjustments, and Stripe refund support for Stripe-backed payments.
- Added owner statement generation with period totals, unit scoping, statement items, and landlord dashboard visibility.
- Expanded the scheduled payment cron to run rent generation, autopay scheduling, scheduled payments, and retry recovery in one protected job.

# 3.3.0 - Rental Payment Operations Expansion

- Added renter wallet foundations with Stripe setup-mode payment-method collection for bank accounts and cards.
- Added scheduled payment records, cancellation workflow, and renter payment timeline events.
- Added landlord financial command center with received payment metrics, scheduled payment totals, Stripe readiness, rent policy editing, and late fee application workflow.
- Added rent billing policies with due day, grace period, late fee mode, late fee amount, daily fee support, and autopay/partial-pay flags.
- Added payment event audit trail, webhook idempotency protections, payment method reconciliation, and failed-payment tracking.
- Added payment-domain helpers for rent policy calculations, landlord operations metrics, tenant payment center data loading, late fee calculation, and safer Stripe event logging.

## v3.2.11 - Contact access intelligence pass

- Added contact permission footprints so each row explains scope, assignment, and source context in one compact line.
- Added governance flags for portfolio-wide explicit access, operational access, multi-source relationships, review requirements, and low-confidence contacts.
- Added a priority contact review queue with quick access to the highest-risk relationships.
- Expanded filters and sorting with portfolio-wide explicit access, operational access, revocable/workflow-only contacts, and permission-footprint sorting.
- Expanded contact CSV exports with scope type, permission footprint, governance flags, and revocation eligibility.
- Tightened contact summary metrics for privileged access and revocable relationship auditing.

## v3.2.10 - Contact governance quality pass

- Added contact risk levels, attention reasons, and recommended actions to the landlord contacts dashboard.
- Added high-risk and low-confidence contact filters plus risk-priority sorting.
- Expanded contact CSV exports with risk, attention, and recommended-action fields.
- Improved contact de-duplication by using stable unit scope keys instead of display labels.
- Fixed a malformed staff-connection sync block to keep the profile connection workflow build-safe.


## 3.2.9 - Stripe Connect Payment Foundation

- Added Stripe Connect onboarding fields for landlord accounts.
- Added payment metadata fields to ledger entries for checkout and webhook reconciliation.
- Added landlord payment setup page with onboarding and status refresh actions.
- Added tenant ledger checkout action for eligible charges.
- Added Stripe webhook route to sync connected-account status and reconcile paid checkout sessions into ledger payments.
- Added payment environment guidance and Vercel preflight warnings.

# v3.2.8 — Contact governance intelligence and density polish

- Added contact review states for stale explicit links, missing profile names, and multi-scope contacts.
- Added confidence scoring, source-count tracking, attention filtering, and review-priority sorting for landlord contacts.
- Expanded contacts CSV export with review status and confidence score columns while sharing the same filter/sort logic as the UI.
- Made the contacts dashboard denser and more usable in smaller spaces with compact KPIs, tighter filters, and streamlined rows.
- Reduced duplicated contact labeling/export logic and centralized contact governance helpers in `src/lib/profile-connections.ts`.

# v3.2.7 — Ledger workflow intelligence and density upgrade

- Added reusable compact ledger dashboard components for metrics, pills, quick links, and signed amount rendering.
- Added shared ledger operations snapshot helpers for overdue balances, due-soon counts, pending entries, voided entries, and collection-rate calculations.
- Upgraded the admin ledger into a tighter finance command center with compact KPIs, sticky quick actions, an attention filter, denser ledger table rows, and clearer risk labels.
- Improved landlord ledger visibility with overdue risk, collection rate, compact metrics, and polished ledger row states.
- Improved applicant ledger UX with compact balance tiles, next-due context, printable statement access, and denser transaction cards.
- Reduced duplicated ledger UI logic so future ledger, billing, and statement features can share safer formatting and status components.

# v3.2.6 — Messaging performance and read-state safety

- Centralized inbox selected-thread parsing and optimistic read-state projection in `src/lib/messaging.ts` so admin, landlord, and applicant inbox pages share the same behavior.
- Hardened read-state updates so a selected thread is only marked read after it is confirmed visible in the current user's inbox result set.
- Removed duplicated selected-thread/read-state mapping code from all three inbox pages.
- Simplified the landlord inbox ownership scope and removed dead role-branch logic.
- Reduced repeated read-receipt calculation during message rendering.

# v3.2.5 — Messaging code quality and permission hardening

- Separated staff inbox behavior from internal-note permission so landlord/staff inboxes keep correct SLA, unread, and waiting-state logic even when internal notes are disabled.
- Locked conversation status management to staff users in both the UI and server action instead of exposing workflow controls to applicant-side inboxes.
- Preserved true last-message timestamps when only status changes, keeping SLA and escalation scoring tied to real communication activity.
- Reduced repeated active-thread computations in the inbox render path for cleaner, more efficient UI logic.
- Hid staff-only internal-note filters from applicant inboxes and improved quick-reply accessibility labels.

# v3.2.4 — Messaging triage intelligence upgrade

- Added smart triage scoring that ranks conversations by waiting state, unread replies, SLA age, escalation age, workflow type, and maintenance priority.
- Added escalation-first messaging views with a 48-hour escalation metric, filter, badges, and next-best-action guidance.
- Expanded inbox filters with sort modes and maintenance-priority filtering for dispatch workflows.
- Improved thread cards with participants, message counts, priority chips, action state, unread state, and clearer workflow context.
- Added active-thread operational guidance so staff can see the next best action before replying.

# v3.2.3 — Messaging read-state and triage polish

- Added shared messaging read-state helpers for staff and applicant inboxes.
- Opening a selected thread now marks only that conversation as read instead of clearing the whole inbox.
- Added unread conversation metrics, unread filtering, and unread badges on thread cards.
- Added sent/seen receipt text for the sender side of a conversation.
- Tightened message triage copy and preserved the prior SLA, quick reply, and filter workflow improvements.


## v3.2.2 - Messaging Feature Hardening

- Improved the command-center inbox with SLA overdue detection and an overdue filter.
- Fixed thread selection links so search/status/type/scope filters are preserved while moving between conversations.
- Converted smart suggestion chips into working one-click quick replies.
- Added richer thread cards with avatars, action badges, context, and compact message previews.
- Added date separators, response status actions, and clearer operational accountability panels.

# 3.2.1 - Messaging Command Center Overhaul

- Rebuilt the inbox into a compact communication command center with operational metrics, search, status/type/scope filters, quick tabs, and richer thread cards.
- Added thread close/reopen workflow actions with audit logging and safe authorization checks.
- Improved conversation detail panels with SLA context, internal note visibility, thread summaries, suggested response snippets, and clearer status/type badges.
- Updated admin, landlord, and applicant inbox pages to support future-safe query parameters and polished Vercel-ready routing.

## 3.2.0 - Compact Dashboard Command Center

- Reworked the shared Workhorse dashboard into a tighter command-center layout with reduced padding, smaller metric tiles, compact queue rows, and denser module cards.
- Added a dashboard quick-action strip, operational activity feed, compact status signals, and better above-the-fold visibility for smaller screens.
- Polished landlord and applicant dashboard navigation into sticky compact bars with smaller controls and improved mobile horizontal scrolling.
- Preserved existing dashboard actions, links, account access requests, and admin approval forms while making the UI more accessible in less vertical space.
- Bumped package version to 3.2.0.

## 3.1.9 - Contact Intelligence and Export Improvements

- Added a landlord Contacts CSV export that respects the active search, source, and assignment filters.
- Centralized contact filtering and governance summary logic in the profile-connections library so the page and export route stay consistent.
- Added contact governance checks for stale explicit links, duplicate scoped relationships, and missing display names.
- Preserved multiple contact sources on deduplicated rows so a person can show as both an explicit connection and a live workflow contact.

## 3.1.8 - Contact System Governance Improvements

- Added landlord-side revocation for explicit profile connections from the Contacts screen.
- Improved contact cards with unit deep links, last-updated dates, and scope metrics.
- Kept workflow-derived contacts read-only so tenants, applicants, and maintenance assignees stay controlled by their source records.
- Added audit logging and cache revalidation when a landlord revokes a profile connection.

# v3.1.7 - Contacts usability and connection management polish

- Upgraded the landlord Contacts page with working search, source filters, assignment filters, and reset controls.
- Added mailto contact actions, clearer system-role labels, scoped assignment visibility, and source-specific badges.
- Added a direct “Manage unit assignments” path so landlords can update staff/contact assignments from the Contacts workflow.
- Hardened the contacts display against empty results and stale filters for cleaner Vercel production rendering.

## v3.1.6 - Profile Connection Hardening and Contacts Upgrade

- Fixed the ProfileConnection schema so portfolio-level connections cannot be duplicated when unitId is null.
- Removed an invalid Application/ProfileConnection back relation that would break Prisma schema validation.
- Added scopeKey migration support for reliable portfolio-versus-unit scoped uniqueness.
- Added ProfileConnection upsert, revoke, staff-assignment sync, and richer landlord contact list helpers.
- Synced unit staff assignments and tenant assignments into explicit ProfileConnection records for the authorization engine.
- Expanded unit, property, application, maintenance, inspection, ledger, and document authorization to respect active profile connections.
- Added a landlord Contacts screen that combines explicit connections with active tenants, applicants, and maintenance contacts.
- Bumped package version to 3.1.6.

## v3.1.5 - Profile Connections Security Model

- Added ProfileConnection with ConnectionRole and ConnectionStatus enums for explicit landlord/staff/contact relationships.
- Added database migration for profile connections with indexes and unique assignment protection.
- Added landlord contact list query helper for active connected users and scoped unit labels.
- Updated unit authorization to allow active profile connections to access their assigned unit.
- Bumped package version to 3.1.5.

## v3.1.4 - Vercel Clean Build Fix

- Fixed the landlord unit detail page search parameter typing so tenant, terms, contact, staff, repair, and photo success states compile cleanly on Vercel.
- Added a small search-parameter helper to safely handle string array query values from Next.js.
- Removed unsupported Next.js config keys that produced Vercel build warnings under Next 14.2.23.
- Updated Vercel preflight checks to match the cleaned Next config.
- Bumped package version to 3.1.4.

## v3.1.3 - Landlord Unit Workflow Hardening

- Added photo uploads directly to add-unit and add-home creation forms, reusing the 12-photo unit library and featured-photo behavior.
- Added unit-level property manager, maintenance, and caseworker assignments with Prisma migration support.
- Upgraded the landlord unit page with a photo-backed Unit Profile header showing nickname and address.
- Added tenant assignment from the unit page; assigning a tenant marks the unit occupied, creates a tenant workflow application, and emails new tenants a secure join link.
- Added editable rent/deposit/move-in terms from the unit page with payment history and ledger previews kept visible.
- Added an Add Contact workflow and automatically surfaces assigned support contacts under Important Contacts.
- Connected new landlord-created repair requests to the unit maintenance assignee by default.
- Added landlord unit workflow verification coverage and bumped package version to 3.1.3.

## v3.1.2 - Dashboard preview and workspace visual alignment

- Fixed the homepage dashboard preview so metrics and workflow panels stay contained instead of clipping inside the hero mockup.
- Tightened the preview sidebar, metric tiles, application rows, and inspection cards to better match the supplied rounded light dashboard reference.
- Restyled the shared Workhorse dashboard with the same light, rounded, soft-panel visual system while preserving the existing dashboard data, module links, tasks, and access-request actions.
- Removed broken encoded bullet characters from the polished homepage dashboard and listing preview text.
- Bumped package version to 3.1.2.

## v3.1.1 - Public homepage polish and marketplace readiness

- Refined the homepage to more closely match the generated public-facing mockup with a polished hero, floating dashboard preview, audience cards, marketplace preview, workflow rows, trust section, testimonial, and final CTA band.
- Connected homepage section navigation, landlord/applicant CTAs, sign-in links, marketplace search form, and live listing cards to real application routes.
- Added live marketplace preview data from available units with a safe fallback preview when no listings exist yet.
- Kept the homepage dynamic and Vercel-ready so public listings can render from the deployed database.
- Bumped package version to 3.1.1.


## v3.1.0 - Public homepage conversion upgrade

- Rebuilt the homepage into a public-facing sales and signup page for landlords, applicants, and tenants.
- Added working in-page section navigation for landlords, tenants, marketplace, workflow, and trust sections.
- Added a prominent marketplace preview with searchable form controls that submit to `/marketplace`.
- Added landlord and tenant audience panels, workflow timelines, trust signals, feature grids, and final conversion CTAs.
- Bumped package version to 3.1.0.


## 3.0.9 - Unit Media and Listing Detail Upgrade

- Added durable `UnitPhoto` records, a migration, and a public/owner-safe photo delivery route for rental listing images.
- Added landlord upload, delete, and featured-photo controls with a 12-photo cap per unit.
- Expanded unit details with school district, neighborhood, nearby features, home and roof age, average utilities, parking, laundry, appliances, flooring, yard, smoking, lease terms, move-in fees, rent due day, late fees, and previous tenant notes.
- Upgraded landlord unit listing cards so each unit is easy to click into as a workspace.
- Added richer landlord unit panels for photos, rent/deposit terms, listing/location details, and tenant history.
- Updated marketplace cards and detail pages to show real listing photos and richer location facts.
- Added unit photo data portability and a focused verification gate.

## 3.0.8 - Admin Data Portability

- Added admin JSON export for users, access requests, properties, units, leads, applications, profiles, documents, inspections, maintenance, messages, leases, ledger records, audit logs, and security events.
- Added admin JSON import that creates or updates records by stable IDs without deleting records missing from the import file.
- Added a downloadable sample import file with 6 users for each current user role and 10 home listings assigned to sample landlords.
- Added data portability verification coverage and included it in the main verification chain.

## 3.0.7 - Small Portfolio Property and Unit Workflow

- Added an `Add Home` fast path for landlords whose address is the rentable home, creating the property shell and listing unit in one step.
- Kept the existing multi-unit property workflow for apartment complexes, duplexes, and buildings with multiple rentable units.
- Updated landlord dashboard, property, unit, and empty-state copy to clearly distinguish single-family homes from multi-unit properties.
- Added property/unit workflow verification coverage and included it in the main verification chain.

## 3.0.6 - Account and Landlord Activation Flow

- Added optional landlord access intent to applicant signup so future landlords can create an account and request the landlord module in one pass.
- Improved the dashboard access request panel with a clear landlord approval path and surfaced request reasons in the admin review queue.
- Added landlord self-service property creation after approval, removing the dead end where a new landlord needed an admin-created property before adding units.
- Updated the landlord empty states and dashboard queue to guide new landlords from property creation to unit publishing.
- Added account-flow verification coverage and included it in the main verification chain.

## 3.0.5 - Password retry and account flow hardening

- Fixed reset-password validation redirects so the token is preserved after a failed first attempt.
- Added retry cache-busting params so password forms remount cleanly after errors.
- Preserved required-password-change context after current-password mistakes.
- Added explicit submit button types on password forms to avoid stale submit behavior.

# 3.0.3 - Demo login button reliability fix

- Made demo login buttons self-healing: clicking a demo account now upserts the matching seeded user, activates it, resets lockout state, clears forced password reset, and applies the shared demo password before creating the session.
- Added the Inspector demo account button so every seeded role has a one-click login path.
- Kept manual login behavior unchanged for non-demo credentials.

## v3.0.2 - Demo Login and Signup Redirect Fix

- Fixed applicant signup so successful `redirect()` calls are no longer caught and displayed as raw `NEXT_REDIRECT` errors.
- Replaced randomized seed passwords with a consistent demo default of `DemoPassword123!`, still overridable through seed environment variables.
- Added one-click demo login buttons for Admin, Landlord, and Applicant accounts.
- Added a seeded inspector account and aligned the sample inspection assignment to that account.
- Bumped package and README version from `3.0.1` to `3.0.2`.


## v3.0.1 - Enum Type Narrowing Build Fix

- Fixed enum-safe role checks in authorization helpers so Vercel/Next TypeScript builds do not fail on narrowed array literal `.includes()` calls.
- Bumped package and README version from `3.0.0` to `3.0.1`.


## v3.0.0 - Tenant Transition and Interface Fluidity Foundation

- Elevated the shared workhorse dashboard with primary action tiles, urgent-first task ordering, and structured access status badges.
- Added applicant profile draft persistence so household or income subform submissions do not wipe unsaved parent profile text.
- Added applicant self-service application withdrawal with audit logging and application history notes.
- Added a consolidated applicant financial calendar for payroll, planned tenant payments, and open ledger due dates.
- Replaced ledger dropdown identifiers with human-readable property/unit and description labels.
- Hardened applicant lease preview wrapping to avoid mobile layout overflow.
- Added `npm run test:form-persistence`, `npm run test:sort-priority`, `npm run test:label-masking`, and `npm run tenant-transition:verify` to the main verification chain.

## v1.8.4 - Lease and E-signature Hardening

- Added a centralized signature workflow helper for tenant and landlord lease signing.
- Made signature completion idempotent by updating only pending signature requests and rejecting stale duplicate submissions.
- Added typed-signature normalization and placeholder-signature rejection.
- Added stronger readiness checks so completed, voided, expired, or already-evidenced requests cannot be signed.
- Added expiration handling with security-event logging when a pending signature is attempted after expiration.
- Added signature-completion security-event logging with lease text hash and signature evidence hash metadata.
- Prevented resending a lease packet for signature after any signer has already completed a signature; admins must reissue instead.
- Reset all electronic-signature evidence fields when a not-yet-signed request is legitimately refreshed.
- Made final signed lease PDF generation idempotent so duplicate completion attempts reuse the existing final document when possible.
- Added `npm run esignature:update4:verify` and included it in the main verification chain.

# v1.8.2 - Messaging Security and Inbox Correctness

## v1.8.3 - Document Access and Visibility Enforcement

- Added centralized document visibility filters for applicant, landlord, and staff-facing document workflows.
- Updated authorized document downloads so document visibility is applied in the database query instead of after an unrestricted lookup.
- Updated applicant application and lease pages to use centralized document and document-request visibility helpers.
- Updated landlord lease document lists to use centralized document visibility helpers.
- Added stricter admin upload validation to reject mismatched application, unit, property, and lease-packet attachments.
- Added document-access verification coverage to prevent regressions in document visibility and download authorization.


- Made the shared text-message inbox thread-selectable with a `?thread=` route state instead of always rendering the first conversation.
- Redirected message sends back to the correct role inbox with the active thread selected.
- Added centralized message and thread visibility helpers so non-staff views do not receive internal notes or internal-only threads.
- Changed internal-note behavior so unauthorized forged submissions are rejected instead of silently converted into public messages.
- Removed hard-coded landlord internal-note access; the UI now shows internal-note controls only when the authorization layer allows them.
- Kept admin inboxes able to see internal notes while applicant and standard landlord inboxes receive only public conversation content.
- Added `scripts/verify-messaging-update2.ts` and included it in the main verification chain.

# v1.8.1 - Authorization Foundation

- Added `src/lib/authorization.ts` as the central permission layer for properties, units, applications, maintenance requests, message threads, documents, lease packets, inspections, and ledger entries.
- Added reusable `assertCanAccess...` helpers so future server actions can reject unauthorized submitted IDs before reading, writing, signing, messaging, or downloading records.
- Hardened workflow messaging so replies check thread-level access and new threads check linked application/maintenance access before creating records.
- Restricted internal message notes to staff-authorized users and filtered internal notes out of the applicant inbox at query time.
- Replaced duplicated document-download authorization with the centralized document visibility/ownership helper.
- Added an authorization verification script and included it in the main verification chain.

# v1.8.0 - Dashboard Modules and Text Messaging

- Kept the applicant dashboard available to every signed-in user as the base dashboard.
- Treated admin users as superusers for module access while preserving module-specific dashboards.
- Allowed approved landlord/property-manager access requests to open landlord module routes without removing the applicant dashboard.
- Added applicant-dashboard module launch cards for approved landlord/admin access.
- Rebuilt applicant, landlord, and admin inboxes with a shared text-message style conversation UI.

# v1.7.9 - Workhorse Dashboard Foundation

- Rebuilt applicant, landlord, and admin landing pages on one shared main dashboard component with consistent metrics, work queue, module launcher, and access state.
- Added account access request records so users can start as applicants and request landlord, property manager, caseworker, inspector, maintenance, vendor, or admin access.
- Added a dashboard access request form and admin-facing approve/decline controls for pending access requests.
- Updated the global header to expose a single Dashboard entry while preserving role-specific admin/landlord/applicant areas.

# v1.7.8 - Admin Route String Hotfix

- Fixed malformed admin maintenance and admin inbox route strings that caused Vercel webpack syntax errors.

# v1.7.7 - Available Rentals Upgrade

- Rebuilt the available rentals page into a full discovery experience with a stronger search header, inventory stats, sticky filters, sort controls, city shortcuts, and featured rental highlight.
- Added expanded marketplace filters for keyword search, min/max rent, minimum square footage, utilities, pets, accessibility, voucher support, bedrooms, bathrooms, and sort modes.
- Added applicant-aware rental match scores using renter profile preferences.
- Upgraded rental cards with save/remove favorite actions, stronger listing hierarchy, feature chips, match labels, and direct inquiry links.
- Connected listing details to the inquiry area with a stable anchor.

# v1.7.6 - Applicant Renter Tools

- Expanded applicant renter profiles with rental goals, voucher, pets, accessibility, employment, references, and renter bio fields.
- Added saved rental favorites with private notes and a logged-in landlord inquiry workflow.
- Added applicant home tools for utility tracking, payroll reminders, and tenant payment planning/confirmation records.
- Added marketplace save-to-favorites support for logged-in applicants and tenants.
- Added Prisma migration for favorites, utilities, payroll reminders, tenant payments, and profile fields.
- Fixed the malformed applicant inbox route string.

# v1.7.5 - Landlord Unit Workflow

- Added landlord unit creation from the landlord portal.
- Units marked `AVAILABLE` continue to publish automatically to the public marketplace.
- Added landlord-managed current tenant/application links on units.
- Added a landlord unit hub with tenant info, lease links, payment history, ledger activity, payment plans, repair submission, contacts, client notes, and messaging.
- Added Prisma migration fields for unit tenant links, important contacts, and client notes.
- Fixed malformed landlord maintenance and inbox route strings.

# v1.7.4 — Workflow Update 4

## Lease Automation + Workflow Cleanup

- Added an admin lease timeline showing draft, approval, signature, completion, and final signed PDF progress.
- Added a manual Refresh Automation action that re-checks completed signatures and generates the final signed PDF when ready.
- Improved automatic lease completion so final signed PDF generation is idempotent and tied to all required signatures.
- Added expired signature renewal controls with a fresh expiration window and queued initial notification.
- Added landlord electronic-signature consent capture, lease text hashing, signature evidence hashing, and final PDF hash propagation to match the tenant flow.
- Added applicant and landlord lease progress cards so users can see signature progress and final lease readiness.
- Updated package and README version consistency to v1.7.4.
- Added verification coverage for workflow update 4.


# v1.7.3

## Maintenance + Inbox Workflow Update

- Added applicant maintenance request workflow
- Added admin and landlord maintenance queues
- Added workflow message inboxes for applicants, admins, and landlords
- Added message threads connected to maintenance and application records
- Added staff-only internal message notes
- Added maintenance assignment, priority, and status tracking
- Added verification coverage for workflow update 3

## v1.7.2 — Workflow Update 2

- Improved admin password recovery so reset links are emailed through the configured provider instead of being shown as the primary production path.
- Added reset email success/failure feedback to the admin user edit screen.
- Added Hobby-mode email processing messaging so admins understand that Vercel Hobby cron processes queued email daily unless they manually process the queue.
- Added notification center queue controls for immediate processing and requeuing failed signature emails.
- Added full queue counts for sent, queued, failed, and delayed-retry notifications instead of relying only on the latest history rows.
- Added Workflow Update 2 verification coverage.

## v1.7.0 — Vercel Hobby compatibility follow-up

## v1.7.1 — Workflow Update 1

- Added database-backed revokable sessions for new sign-ins while preserving legacy cookie-session compatibility during rollout.
- Added applicant self-signup with automatic matching to existing applications by email address.
- Added secure application claim links so admins can connect marketplace/application records to applicant portal accounts.
- Added claim-link landing pages that create or connect applicant accounts and route users directly to their application.
- Added Prisma migration for `UserSession` and `ApplicationClaimToken`.
- Kept the update Vercel Hobby-compatible; claim links do not rely on high-frequency cron.


- Fixed the Vercel preflight checker so it parses `vercel.json` instead of relying on whitespace-sensitive string matches.
- Confirmed `framework: nextjs` and `buildCommand: npm run vercel-build` are required in `vercel.json`.
- Kept Hobby-safe daily cron scheduling for queued email processing.
- Changed missing `CRON_SECRET` from a hard build failure to a deployment warning unless `VERCEL_STRICT_ENV=1` or `REQUIRE_CRON_SECRET=true` is set.
- Documented that scheduled cron requests will be rejected until `CRON_SECRET` is configured in Vercel.

## v1.7.0 — Vercel Hobby compatibility

- Adjusted Vercel cron configuration to comply with Hobby plan limits by running the queued-email processor once daily.
- Prevented deployment failures caused by unsupported cron frequencies on Hobby.
- Updated Vercel deployment documentation to explain Hobby daily-processing mode and the future Pro upgrade path.
- Added Vercel preflight validation to catch accidental non-Hobby cron schedules before deployment.

## v2.6.12 Update 12 — Production polish and compliance readiness

- Centralized app version display through `src/lib/app-version.ts`.
- Replaced hardcoded version strings in admin/system UI.
- Added Privacy, Terms, Fair Housing, and Accessibility starter pages.
- Added footer legal/compliance navigation.
- Added skip-to-content accessibility link.
- Added root Open Graph metadata, robots, and sitemap routes.
- Expanded upload support to HEIC/HEIF, CSV, and XLSX.
- Rewrote README to remove old version contradictions.
- Added Update 12 verification script and npm command.

## v2.6.12-update7

- Replaced the hand-built PDF string writer with pdf-lib for generated lease PDFs.
- Added font-width-based text wrapping, safe long-word splitting, PDF metadata, and deterministic output.
- Updated lease packet and final signed lease generation to await the PDF renderer.
- Added `npm run pdf:verify` and included it in verification/smoke scripts.
- Documented the remaining Unicode-font limitation and future embedded-font path.


## v2.6.12-update6

- Added S3-compatible object storage provider for uploaded and generated documents.
- Added Cloudflare R2/AWS S3/MinIO environment configuration.
- Added object-storage write/read/delete smoke verification.
- Added migration helper to move existing local/database documents to object storage.
- Updated environment validation and system status messaging for production object storage.


## v2.6.12 Update 5 — Security Headers

- Added a centralized browser security header policy in `next.config.mjs`.
- Added CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, permissions policy, and cross-origin isolation headers.
- Disabled the `X-Powered-By` header and kept compression enabled.
- Expanded `npm run security:verify` coverage for the new header policy.

# Changelog

## 2.6.9 - Vercel Audit Metadata Build Fix

- Fixed Vercel TypeScript build errors in audit and security-event metadata writes by using Prisma JSON input typing.
- Keeps prior Vercel fixes for Next config, Prisma generation, schema relations, enum typing, server-action form typing, document route narrowing, and AppHeader typing.


## v2.6.7 - Vercel document route type fix

- Fixed strict TypeScript narrowing in the protected document download API route.
- Keeps the v2.6.x Vercel configuration, Prisma generate, schema relation, seed check, account action, server-action form, and enum typing fixes.

## v2.6.6 - Vercel TypeScript locked status fix

- Fixed strict TypeScript build errors caused by narrowed enum arrays in admin lease/payment-plan actions.
- Kept prior Vercel, Prisma, and server-action build fixes.


## v2.6.6 - Vercel React Server Action Type Fix

- Added a React type augmentation for server action form submissions so Vercel/TypeScript accepts `<form action={serverAction}>` in App Router server components.
- Kept the prior Vercel fixes for Prisma generation, `next.config.mjs`, the inspection relation, seed verification typing, and account action redirects.



## v2.6.4 - Vercel Account Action TypeScript Fix

- Fixed a strict TypeScript narrowing issue in `src/app/account/actions.ts` by marking the password error redirect helper as `never` returning.
- Keeps the Vercel config, Prisma generate, Prisma relation, and seed verification fixes from the prior Vercel patches.


## 2.6.3 - Vercel TypeScript Verify-Seed Fix

- Fixed a TypeScript inference issue in `scripts/verify-seed.ts` that caused Vercel builds to fail while checking valid lease packet statuses.
- Preserved the previous Vercel-compatible Next.js config and Prisma relation fixes.

## v2.6.0

- Added storage verification script for protected document storage.
- Added database-backed seed verification for core sample records across users, inventory, applications, documents, leases, signatures, inspections, ledger, recurring schedules, and payment plans.
- Added workflow verification for landlord scoping, applicant scoping, application relationships, ledger balances, recurring-charge duplicate keys, and signature/notification counts.
- Added static security verification for role checks, CSV safety, storage safety, upload-size alignment, recurring-charge safeguards, and financial voiding behavior.
- Added `npm run qa:smoke` and expanded `npm run verify`.
- Added QA and workflow verification documentation.
- Updated preflight checks, system page, README, and package version.

## v2.5.0

- Added reusable pagination utilities and admin pagination UI.
- Added reusable search/filter controls for admin list screens.
- Added search, status filters, and pagination to Leads, Applications, Documents, Audit Log, Inspections, Leases, and Ledger activity.
- Reduced unbounded high-volume `findMany()` list queries on major admin screens.
- Kept existing forms, detail screens, and workflows intact while improving list usability.
- Updated README and package version.

## v2.4.0

- Added quality and safety hardening without introducing major new user-facing modules.
- Raised the server action body-size limit to 12mb so the 10mb document upload limit is not blocked by Next.js first.
- Hardened protected session checks so `requireUser` and `requireRole` verify the database user is still active and still has the expected role.
- Added CSV formula-injection protection for exported spreadsheet values.
- Added recurring-charge source metadata and a database-level uniqueness constraint to prevent duplicate generated monthly charges.
- Updated recurring charge generation to use stable period keys and tolerate duplicate-generation race conditions safely.
- Tightened payment-plan installment changes so changing a paid installment back to due/missed/waived voids the linked ledger payment.
- Expanded route inventory coverage for key nested/edit/detail routes.
- Strengthened preflight checks for upload configuration and recurring-charge safeguards.
- Updated README, changelog, migrations, and package version.

## v2.3.0

- Added ledger reporting and export workflow.
- Added full ledger CSV export at `/admin/ledger/export`.
- Added balance aging CSV export at `/admin/ledger/aging/export`.
- Added reports hub at `/admin/ledger/reports`.
- Added printable applicant/tenant statements at `/admin/ledger/statements`.
- Added per-application statement pages and CSV exports.
- Added applicant-facing printable statement and CSV export.
- Added CSV helper utilities and shared ledger report grouping helpers.
- Updated ledger, aging, applicant ledger, route checks, README, and package version.

## v2.2.0

- Added payment plan and balance aging workflow.
- Added PaymentPlan and PaymentPlanInstallment Prisma models.
- Added statuses for active/completed/defaulted/cancelled plans and due/paid/missed/waived installments.
- Added admin payment plan center, new plan page, and plan detail page.
- Added balance aging report at `/admin/ledger/aging`.
- Added automatic ledger payment entry creation when installments are marked paid.
- Added applicant and landlord payment plan visibility on their ledger pages.
- Added seeded sample payment plan and installments.
- Added v2.2.0 Prisma migration and updated route checks/package version.

## v2.1.0

- Added recurring monthly charge schedules for rent and recurring fees.
- Added admin schedule center at `/admin/ledger/schedules`.
- Added schedule creation at `/admin/ledger/schedules/new`.
- Added schedule detail pages with tenant/subsidy split display and aging context.
- Added bulk generation for due recurring charges through a selected run-through date.
- Added duplicate protection so an already-generated monthly charge is not created again for the same schedule/date.
- Added pause and resume controls for recurring charge schedules.
- Added tenant/subsidy split fields to recurring schedule records.
- Added balance aging labels to ledger balance views.
- Added v2.1.0 Prisma migration and seeded recurring schedule sample data.
- Updated route checks and package version.

# Changelog

## v2.5.0

- Added reusable pagination utilities and admin pagination UI.
- Added reusable search/filter controls for admin list screens.
- Added search, status filters, and pagination to Leads, Applications, Documents, Audit Log, Inspections, Leases, and Ledger activity.
- Reduced unbounded high-volume `findMany()` list queries on major admin screens.
- Kept existing forms, detail screens, and workflows intact while improving list usability.
- Updated README and package version.

## v2.0.0

- Added rent and payment ledger foundation.
- Added LedgerEntry model with charge, payment, credit, and adjustment entry types.
- Added posted, pending, and voided ledger statuses.
- Added payment method tracking.
- Added admin ledger center, ledger creation page, and ledger detail/void workflow.
- Added open balance summaries and application balance snapshots.
- Added landlord ledger visibility scoped to owned units.
- Added applicant ledger visibility scoped to the signed-in applicant or tenant.
- Added sample seeded charge and payment entries.
- Added v2.0.0 Prisma migration and updated route checks.
- Updated dashboard, homepage, system page, security checklist, README, and package version.

## v1.9.0

Inspection workflow release.

- Added admin inspection scheduling at `/admin/inspections/new`.
- Added admin inspection list and detail pages.
- Added inspection status tracking for scheduled, in progress, passed, failed, needs reinspection, and cancelled outcomes.
- Added inspection checklist items with pending/pass/fail/not-applicable statuses.
- Added landlord inspection visibility scoped to owned units.
- Added applicant inspection visibility scoped to the applicant's applications.
- Added inspection audit logs and security events.
- Added v1.9.0 Prisma migration and updated package version.

## v1.8.0

Email delivery integration release.

- Added an email delivery provider abstraction with `console`, `resend`, `webhook`, and `disabled` modes.
- Added `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_SEND_ON_QUEUE`, `RESEND_API_KEY`, and `EMAIL_WEBHOOK_URL` environment settings.
- Added provider, provider message ID, last attempt, sent, failed, and failure reason tracking to signature notifications.
- Added admin notification center controls to send one notification now or send queued notifications in bulk.
- Added `npm run email:send-queued` for cron/scheduled delivery.
- Password reset requests and admin-created reset links now use the configured email provider.
- Document request creation now sends an applicant email notice through the configured provider.
- Added v1.8.0 Prisma migration and updated package version.

## v1.7.0

- Added signature notification records for initial notices, reminders, expiration warnings, and expired requests.
- Added expiration dates, reminder counts, last reminder timestamps, and last notification timestamps to signature requests.
- Added admin notification center at `/admin/notifications`.
- Added reminder queue actions, expiration extension controls, and overdue request expiration.
- Added email-ready notification bodies that can be connected to an email provider later.
- Added applicant and landlord expiration messaging before signing.
- Added v1.7.0 Prisma migration and updated package version.

## v1.6.0

Signed lease finalization release.

- Added final signed lease PDF generation after all required signatures are completed.
- Added final signed lease completion certificate text with signature names, timestamps, IP address, user-agent, and request IDs.
- Added `lockedAt`, `finalDocumentId`, `finalPdfGeneratedAt`, `reissuedFromId`, and `reissueReason` fields to lease packets.
- Locked lease packet term edits after packets are sent for signature, completed, or voided.
- Added admin action to manually regenerate a final signed PDF for completed packets missing a final document.
- Added void-and-reissue workflow that voids pending signature requests, voids the old packet, and creates a replacement draft.
- Added final signed lease controls to the admin lease packet page.
- Added final signed lease documents as shared documents visible to admins, assigned applicants, and assigned landlords.
- Added security event types for final lease generation and lease reissue.
- Added v1.6.0 Prisma migration and updated package version.

## v1.5.0

E-signature workflow foundation release.

- Added `SignatureRole` and `SignatureStatus` enums.
- Added `SignatureRequest` records connected to lease packets and users.
- Added `SENT_FOR_SIGNATURE` and `COMPLETED` lease packet statuses.
- Added admin action to send lease packets for tenant and landlord signature.
- Added signature tracking to admin lease packet detail pages.
- Added applicant lease signature list and detail pages.
- Added landlord lease signature list and detail pages.
- Added typed signature capture with signed timestamp, IP address, and user-agent metadata.
- Added automatic lease completion when all pending signature requests are signed.
- Added signature-related audit logs, lease notes, route checks, seed data, and a v1.5.0 migration.
- Package version updated to `1.5.0`.

## v1.4.0

Lease PDF generation release.

- Added a lightweight server-side PDF generator.
- Added generated document storage support.
- Added admin action to generate a lease PDF from a lease packet.
- Added Generate PDF button to lease packet detail pages.
- Stored generated lease PDFs as protected `Document` records.
- Linked generated PDFs to lease packets, applications, properties, and units.
- Added lease notes and audit logs for PDF generation.
- Updated dashboard, system, security, homepage, README, and package version.

## v1.3.0

- Added lease template records and admin template management.
- Added lease packet records connected to applications.
- Added application-to-lease creation for approved applications.
- Added admin lease list and lease detail pages.
- Added PDF-ready lease preview rendering with template tokens.
- Added lease packet status tracking, editable lease terms, and internal lease notes.
- Added seeded sample lease template and lease packet.
- Added Prisma migration for the lease builder foundation.

## v1.2.0

Document request and checklist workflow release.

- Added `DocumentRequestStatus` and `DocumentRequest` to the Prisma schema.
- Added a v1.2.0 Prisma migration for document requests.
- Added admin ability to request specific documents from an application detail page.
- Added admin ability to review requested documents as requested, submitted, accepted, rejected, or waived.
- Added applicant-facing requested-document checklist cards.
- Added applicant upload flow for fulfilling a specific requested document.
- Linked fulfilled document requests to uploaded document records.
- Added document request counts to admin application lists and applicant dashboard cards.
- Updated the admin document center with an open request queue.
- Updated seed data with sample Photo ID and Proof of Income requests.
- Package version updated to `1.2.0`.

## v1.1.1

Stabilization, setup, and migration cleanup release.

- Added baseline Prisma migration files for fresh PostgreSQL setup.
- Added migration lock file.
- Added `db:setup`, `db:reset`, `migrations:check`, `routes:check`, and `verify` scripts.
- Strengthened preflight checks for required files, pinned package versions, environment warnings, and local document storage access.
- Added route inventory checking for key public, admin, landlord, applicant, account, and document routes.
- Updated admin system page to reflect v1.1.1 and the new recommended local checks.
- Updated README with setup, reset, production notes, known issues, and the next recommended update.
- Package version updated to `1.1.1`.

## v1.1.0

Production authentication hardening release.

- Added database-backed failed login counters and temporary account lockouts.
- Added security event logging for login success, login failure, account lock, logout, password reset, and password change events.
- Added signed-in account password change page at `/account/password`.
- Added forgot/reset password pages with one-time reset tokens.
- Added admin-generated password reset links from the user edit screen.
- Added required password-change handling after admin-created or admin-reset passwords.
- Added admin security event viewer at `/admin/security/events`.
- Added new user security fields to the Prisma schema.
- Updated middleware to protect `/account` routes.
- Updated dashboard, security checklist, README, and package version.

## v1.0.0

Production-readiness release.

### Added

- New `AuditAction` enum and `AuditLog` model.
- New audit helper at `src/lib/audit.ts`.
- New admin audit log page at `/admin/audit`.
- New system status page at `/admin/system`.
- New environment warning helper at `src/lib/env.ts`.
- New `npm run preflight` script.
- New `npm run typecheck` script.
- Audit events for major admin inventory changes.
- Audit events for user management changes.
- Audit events for lead and application workflow changes.
- Audit events for document upload, review, delete, and download actions.
- Audit events for login and logout actions.

### Changed

- Admin dashboard now links to Audit, System, and Security pages.
- Document storage path validation now checks path boundaries more strictly.
- Security checklist now reflects v1.0.0 hardening work.
- Homepage and README now describe the production-readiness release.
- Package version updated to `1.0.0`.

### Still recommended before public deployment

- Replace local auth scaffold or harden it further.
- Move rate limiting to Redis or another persistent shared store.
- Move document storage to private object storage.
- Run `npm run typecheck`, `npm run build`, and route testing locally.

## v0.9.0

Document upload and file management release.

- Added document upload and file management.
- Added document categories, statuses, and visibility controls.
- Added protected local document storage with `/api/documents/[id]` downloads.
- Added admin document center at `/admin/documents`.
- Added application-level document upload and review tools.
- Added applicant document uploads from application detail pages.
- Added document relationships to applications, properties, units, and users.

## v0.8.0

Applicant portal and real application forms release.

## v0.7.0

Landlord portal and ownership-scoped access release.

## v0.6.0

HomeBase MLS rename and application workflow release.

## v0.5.0

User and role management release.

## v0.4.1

Security and stability hardening release.

## v0.4.0

Authentication scaffold release.

## v0.3.0

Public marketplace release.

## v0.2.0

Inventory management release.

## v0.1.0

Initial app shell.

## v2.6.2 Vercel/Prisma hotfix

- Replaced `next.config.ts` with Vercel-compatible `next.config.mjs`.
- Updated the build script to run `prisma generate` before `next build`.
- Added `postinstall` Prisma generation for Vercel installs.
- Fixed the missing Prisma back-relation from `Unit` to `Inspection`.

## 2.6.8 - Vercel App Header Build Fix

- Fixed Vercel TypeScript build error by making `AppHeader` a synchronous server component.
- Keeps prior Vercel fixes for Next config, Prisma generation, schema relations, enum typing, server-action form typing, and document route narrowing.

## v2.6.12 Update 4 — Password/security policy hardening

- Added a centralized password policy helper with a 14-character minimum and complexity checks.
- Blocked old demo/default passwords such as `admin12345`, `landlord12345`, and `applicant12345`.
- Applied the stronger policy to admin-created users, admin password updates, self-service password changes, and password resets.
- Replaced static seed passwords with generated temporary passwords or optional `SEED_*_PASSWORD` environment variables.
- Marked seeded users for forced password change.
- Updated login, account, reset, README, and `.env.example` copy to remove unsafe demo-password guidance.
- Expanded static security verification to check the new password-hardening controls.

## v2.6.12 Update 8 - E-signature evidence hardening

- Added explicit electronic-signature consent capture to tenant lease signing.
- Stored the exact consent text accepted by the signer.
- Added lease text SHA-256 hashing at signature time.
- Added signature evidence SHA-256 hashing.
- Added final signed PDF SHA-256 hashing.
- Stored final PDF hash on generated lease documents and signed signature requests.
- Added administrator visibility into signature evidence hashes.
- Added `npm run esignature:verify`.


## Update 10 — Email Queue + Production Environment Hardening

- Added durable retry metadata for queued signature notifications.
- Added protected `/api/cron/send-queued-email` endpoint.
- Added exponential retry backoff and max-attempt handling.
- Made production `APP_URL` fail closed when missing or non-HTTPS.
- Added email queue verification script and docs.

## v2.6.12 Update 11 — Automated Tests and Observability

- Added Vitest-based unit test scaffolding.
- Added tests for password policy, environment validation, email configuration, and structured logger behavior.
- Added structured JSON logger with sensitive field redaction.
- Replaced key `console.error` paths in audit/security/rate-limit/email flows with structured logging.
- Added `observability:verify` and included tests/observability in the main `verify` script.

## v2.6.12 Vercel compliance patch

- Added `vercel.json` with Next.js framework config, Vercel build command, region, and queued-email cron schedule.
- Added `npm run vercel-build` so Vercel runs preflight, Prisma generation, migrations, and Next build in order.
- Added `npm run vercel:preflight` and `scripts/verify-vercel.ts` for Vercel-specific environment, storage, cron, Prisma, and security-header checks.
- Added `docs/VERCEL_DEPLOYMENT.md` and updated `.env.example` to prefer S3-compatible storage for production Vercel deployments.

## v1.7.0 follow-up — Vercel TypeScript compatibility

- Fixed the global layout/header compile error caused by rendering an async header component directly in JSX.
- Moved verified user loading to the async root layout and made `AppHeader` a synchronous presentational component.
- Preserved DB-verified session display behavior while keeping the build compatible with Vercel/Next.js TypeScript checks.

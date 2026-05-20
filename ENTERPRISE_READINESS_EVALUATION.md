# Enterprise Readiness Evaluation

Evaluated version: 4.46.0 - First Release Codebase Readiness

## 1. Executive Summary

HomeBase MLS is no longer a small prototype. The platform has a credible enterprise product shape: a polished public homepage, data-backed marketplace search, reusable applicant packet flow, dedicated tenant portal, landlord dashboard, tenant directory, unified landlord inbox, maintenance/vendor operations, role-based dashboards, and an Admin Command Center with super-user protections.

The platform is **close to enterprise-grade for a controlled pilot**, but it is **not ready for a full public enterprise launch** yet. The strongest areas are product breadth, role-aware dashboards, marketplace direction, admin operations visibility, and central authorization helpers. The weakest areas are verified production stability, full permission coverage proof, mobile QA across every workflow, codebase breadth/bloat, overlapping legacy admin/applicant surfaces, and lack of a successful typecheck/build/test run in the current environment.

The current release is best treated as a strong pilot candidate after critical validation. It should not be presented as fully production hardened until CI can run `npm run verify`, `npm run build`, and representative end-to-end permission/workflow tests.

## 2. Overall Enterprise Readiness Score

**Overall score: 7.3 / 10**

This score reflects a broad, serious product that has many enterprise-grade pieces in place, but still needs release validation and narrowing. The platform feels much more complete than a prototype, but enterprise-grade also requires provable reliability, security coverage, operational simplicity, and test/build confidence. Those proof points are not fully present yet.

## 3. Category Scorecard

### Public Homepage and Marketing - 8.2 / 10

What works:
- `src/app/page.tsx` is polished, clear, and data-backed.
- The hero explains the product well: marketplace plus rental operations.
- CTAs support renters, landlords, partners, and existing users.
- Featured listings use real `Unit` data; unavailable data falls back honestly.
- Trust/security messaging exists and avoids fake inventory claims.

What is weak:
- Some product preview metrics are visual/product labels rather than actual metrics. They are not presented as live numbers, but reviewers may still read them as system capability claims.
- The homepage is visually strong, but live browser/mobile QA was not possible in this environment.

Needs improvement:
- Browser QA on desktop/mobile.
- Confirm public CTAs all land on intended first-run paths.
- Add accessibility review for heading order, focus states, and form labels.

### Marketplace Search/Discovery - 7.8 / 10

What works:
- `src/app/marketplace/page.tsx` supports query state, filters, sort, pagination, saved searches, no-results recovery, broader matches, and map-preview grouping.
- `src/lib/marketplace/listings.ts` centralizes listing query behavior.
- Listing details in `src/app/marketplace/[unitId]/page.tsx` are strong and use real photos via `/api/unit-photos/[id]`.
- Search state is URL-backed.

What is weak:
- Map/list is still a location-preview mode, not a true interactive map with bounds, clustering, or marker/list synchronization.
- Performance for very large marketplaces needs query/index review.
- Availability/date filtering exists, but needs production data QA.

Needs improvement:
- Add latitude/longitude plus address privacy model before full interactive mapping.
- Add Playwright coverage for filter combinations, saved search permissions, no-results recovery, and mobile filter drawer.

### Applicant/Renter Workflow - 7.6 / 10

What works:
- `src/app/applicant/apply/[unitId]/page.tsx` makes applying simpler and clearly asks for authorization to share the reusable packet.
- `src/lib/applicant/packet-readiness.ts` supports reusable profile readiness.
- Applicant dashboards in `src/lib/dashboard/role-dashboard.ts` prioritize profile completeness, applications, saved homes, unread messages, and documents.
- Applicant navigation is now simplified in `src/lib/navigation/first-release.ts`.

What is weak:
- The older `src/app/applicant/page.tsx` still contains multiple resident-like dashboard branches, which overlaps conceptually with `/tenant`.
- Privacy language is present, but the exact shared fields and locked/unlocked states need full UX review.
- The profile/application flow is broad and may still feel heavy without first-run guidance on every subpage.

Needs improvement:
- Finish separating tenant-only resident flows away from applicant routes.
- Add explicit "what will be shared" field-by-field preview and audit trail for profile sharing.

### Tenant Workflow - 7.0 / 10

What works:
- A dedicated `/tenant` portal exists with resident navigation.
- Tenant dashboard logic handles active and missing occupancy states.
- Tenant paths exist for lease, rent, maintenance, inbox, documents, notices, inspections, calendar, ledger, and tasks.

What is weak:
- Some tenant routes still redirect or reuse applicant-backed pages, which weakens the resident mental model.
- Tenant maintenance and rent/payment flows need end-to-end browser QA.
- Tenant first-run states depend heavily on occupancy data being present and correct.

Needs improvement:
- Replace redirected/reused tenant pages with native tenant pages where user-facing wording matters.
- Add tenant portal E2E tests for current unit, maintenance request, inbox, lease, and document access.

### Landlord/Property Manager Workflow - 7.6 / 10

What works:
- Landlord navigation now focuses on properties, units, listings, applications, tenants, inbox, maintenance, vendors, inspections, calendar, and reports.
- `src/app/landlord/tenants/page.tsx` provides a real directory scoped to landlord-owned records.
- `src/app/landlord/inbox/page.tsx` uses a unified inbox adapter.
- Landlord dashboard surfaces needs attention, applications, messages, units, and operations.

What is weak:
- There are still overlapping route families: `/landlord/rentals`, `/landlord/units`, `/landlord/properties`, `/landlord/leads`, and some legacy operation pages.
- Bulk management for hundreds/thousands of units is not fully proven.
- Property manager scoping through approved access/profile connections still needs real scenario testing.

Needs improvement:
- Add server-side pagination/filtering to tenant directory and operational lists that currently cap at `take: 500`.
- Create property-manager relationship tests and route-level permission tests.

### Unified Messaging/Inbox - 7.4 / 10

What works:
- `src/lib/messaging/unified-landlord-inbox.ts` normalizes leads and message threads into a consistent shape.
- Landlord inbox can surface lead, application, maintenance, lease, tenant, and general context.
- Unread/needs-reply logic exists and connects to dashboard surfaces.

What is weak:
- This is adapter-based, not a single canonical conversation model.
- Lead notes and message threads remain separate data sources.
- Vendor/applicant/tenant inboxes are not as unified as landlord inbox.

Needs improvement:
- Create a migration plan toward canonical `Conversation`/`ConversationMessage` or equivalent.
- Add permission tests for opening/replying to guessed thread IDs.

### Maintenance/Inspection/Vendor Workflows - 7.1 / 10

What works:
- Maintenance statuses, priorities, vendor work logs, invoices, recurring tasks, and field updates are represented.
- Vendor portal exists in `src/components/vendors/VendorPortalView.tsx`.
- Inspector dashboard exists and is role protected.
- Admin Command Center tracks stale maintenance and failed inspections.

What is weak:
- Inspector workflow appears dashboard-centric; inspection detail/report depth needs manual review.
- Vendor messaging is not yet a first-class unified inbox.
- SLA/payout/estimate flows need real operational test data and QA.

Needs improvement:
- Add end-to-end tests for maintenance request -> assign vendor -> vendor update -> invoice -> landlord approval.
- Expand inspector report workflow from dashboard links into a complete field-ready experience.

### Role-Based Dashboards - 8.0 / 10

What works:
- `src/lib/dashboard/role-dashboard.ts`, `src/lib/dashboard/permissions.ts`, and `src/components/dashboard/RoleDashboard.tsx` form a strong role-aware system.
- Metrics are query-backed and not obviously fake.
- Needs Attention sections are role-specific.
- Expanded account access is considered.

What is weak:
- Some low-level pages still have their own older dashboard/page-header language.
- Dashboard query performance needs review with larger data volumes.
- The dashboard logic is a large file and should eventually be split by role.

Needs improvement:
- Add role-dashboard tests with seeded records for each role.
- Split dashboard builders into role-specific modules once behavior stabilizes.

### Admin/Super User Operations - 7.8 / 10

What works:
- `src/components/admin/AdminCommandCenter.tsx` and `src/lib/admin/command-center.ts` create a real operations center.
- Super user access is modeled through `AccountAccessType.SUPER_USER` and `src/lib/admin/permissions.ts`.
- Data quality, blocked workflows, failed integrations, production health, security alerts, sample data detection, and audit activity are surfaced.
- Sample data cleanup is intentionally disabled until tagging is safe.

What is weak:
- Some admin routes still overlap with command-center sections.
- `/admin/system/sample-data/route.ts` allows normal `ADMIN` to download sample data; that may be acceptable, but if sample data contains realistic personal information, it should be super-user-only.
- Some operations sections depend on real logs/integration events existing; otherwise they can read as empty placeholders.

Needs improvement:
- Decide which admin pages are command-center drilldowns versus legacy pages.
- Restrict sample data controls/downloads to `requireSuperUser` if the payload resembles production data.

### Security and Permissions - 7.2 / 10

What works:
- Server-side auth is implemented in `src/lib/auth.ts`.
- Central record authorization exists in `src/lib/authorization.ts`.
- Document downloads use `getAuthorizedDocument`.
- Nonpublic unit photos use `canAccessUnit`.
- Cron routes require `CRON_SECRET`/`VERCEL_CRON_SECRET` in production.
- Webhooks validate shared signatures.

What is weak:
- Permission coverage is not proven for every server action/API route.
- Property manager scoping is complex and needs test coverage.
- `canAccessLead` allows applicant-like users by matching lead email, but there is no obvious public applicant lead detail route; this is probably harmless, but email-only identity matching deserves caution.
- Some server actions likely still perform inline scoping rather than central `assertCanAccess*` helpers.

Needs improvement:
- Build a route/action permission matrix.
- Add guessed-ID tests for applications, tenants, documents, photos, message threads, maintenance requests, inspections, leases, and ledger entries.

### Data Model/Prisma Architecture - 7.5 / 10

What works:
- Schema supports the intended platform breadth: properties, units, applications, applicant profiles, documents, messages, maintenance, inspections, vendors, payments, integrations, audit/security, saved searches.
- Enums are mostly aligned to product statuses.
- Account access model supports expanded roles and super-user access.

What is weak:
- Schema breadth is high for a first release.
- Some relationships and models reflect accumulated modules, making onboarding and future changes harder.
- JSON fields and integration/event payloads need typed DTO boundaries.
- Indexes need review for marketplace search, dashboards, inbox, reports, and admin command center.

Needs improvement:
- Add database index review before production scale.
- Document canonical ownership/scoping rules per model.

### Code Quality/Maintainability - 7.0 / 10

What works:
- First-release navigation has been centralized.
- Unused `WorkhorseDashboard` was removed.
- Shared UI system exists.
- `npm run verify` now points to a focused release gate.

What is weak:
- The repo still has many historical docs and verifier scripts.
- Some large files carry too much responsibility, especially `src/lib/dashboard/role-dashboard.ts`, `src/app/marketplace/page.tsx`, and admin/landlord operational pages.
- Some duplicated page header/status patterns remain.
- Full TypeScript/build/test status could not be confirmed here.

Needs improvement:
- Continue removing historical release artifacts not needed in the live repo.
- Split large modules into role/domain-specific files.
- Move marker-based verifiers toward behavior tests.

### Visual Design Consistency - 7.6 / 10

What works:
- Shared UI primitives in `src/components/ui/system/index.tsx` improve consistency.
- Homepage, marketplace, role dashboards, landlord tenant directory, maintenance, and admin command center have modern card/spacing systems.
- Status labels and empty states are improving.

What is weak:
- Older admin/landlord pages still use separate `AdminPageHeader` and `LandlordPageHeader`.
- Some pages likely still have older compact table/card styles.
- No browser screenshot QA was possible in this environment.

Needs improvement:
- Visual QA pass using Playwright/browser screenshots across mobile and desktop.
- Continue migrating to `ProductPageHeader`, `WorkflowStatusBadge`, shared empty/error/loading states.

### Mobile Responsiveness - 6.8 / 10

What works:
- `DashboardShell` includes mobile drawer navigation and horizontal quick nav.
- Marketplace includes mobile filter/drawer behavior.
- Major pages use responsive grid classes.

What is weak:
- Many operational pages are dense and not proven on mobile.
- Tables and multi-column admin/reporting views need device QA.
- Unified inbox mobile experience needs direct testing.

Needs improvement:
- Mobile regression suite for homepage, marketplace, listing detail, applicant apply, landlord inbox, tenant directory, maintenance, vendor jobs, and admin command center.

### Accessibility - 6.7 / 10

What works:
- Many forms include labels or screen-reader labels.
- Shell controls include aria labels for drawer/palette.
- Semantic headings are generally present.

What is weak:
- Accessibility has not been systematically tested.
- Icon-only actions, color contrast, focus trapping, status announcements, and drawer/modal focus behavior need audit.
- `img` usage in listing pages needs review for alt consistency.

Needs improvement:
- Run axe or Playwright accessibility checks.
- Add keyboard-only QA for marketplace filters, dashboards, inbox, admin command center, and forms.

### Production Readiness - 6.4 / 10

What works:
- Focused release verification script exists.
- Route inventory and package cleanliness pass in the local environment.
- Auth, env validation, cron secrets, webhook signatures, audit logs, and package cleanup are present.

What is weak:
- `npm` is unavailable in this environment, so typecheck, lint, test, and build could not be run.
- No confirmed CI pass is included in this evaluation.
- Production observability/backups/recovery assumptions are not fully proven.

Needs improvement:
- Successful CI run for `npm install`, `npm run verify`, `npm run build`.
- Manual pilot QA with seeded realistic data.

## 4. Enterprise-Grade Gaps

### Product/Workflow Gaps

- Tenant portal still depends on some applicant-era routes and mental models.
- Unified messaging is strongest for landlords; applicant/tenant/vendor messaging is less unified.
- Inspector workflow needs deeper assigned-inspection/report UX.
- Property-manager workflow and permissions need real-world scenario proof.
- Admin Command Center exists, but old admin pages still compete with it.

### Visual/UX Gaps

- Older page header systems remain alongside shared `ProductPageHeader`.
- Status badge migration is incomplete.
- Dense operational pages need mobile and accessibility review.
- Some product preview panels still feel conceptual rather than live-operational.

### Mobile Gaps

- Marketplace mobile likely strongest; admin/landlord/vendor pages need testing.
- Large tables/reports may overflow or become hard to use.
- Inbox and context panels need phone-sized QA.

### Code Quality Gaps

- Historical verifier scripts/docs remain in the repo.
- Some files are too large and mix query, DTO, and UI concerns.
- Marker-based verification is useful but not enough for release confidence.
- Repeated status label/header patterns remain.

### Data/Model Gaps

- Broad schema needs index review.
- Sample/demo tagging is not comprehensive enough for safe cleanup.
- Messaging still has adapter-normalized sources rather than a canonical model.
- Some JSON payloads need stronger typing boundaries.

### Security/Permission Gaps

- Need exhaustive permission matrix for server actions and API routes.
- Need guessed-ID tests across sensitive records.
- Sample data download currently uses `requireRole(["ADMIN"])`, not super-user.
- Property manager/profile-connection scoping needs production-like validation.

### Admin/Operations Gaps

- Command Center is strong, but drilldown ownership is not fully rationalized.
- Failed integrations and security alerts depend on logging coverage.
- Backup/recovery posture is not fully documented.

### Production-Readiness Gaps

- Typecheck/lint/test/build not confirmed in this environment.
- No browser/mobile QA evidence attached.
- No load/performance review for marketplace/dashboard/admin queries.

## 5. Page and Flow Evaluation

### Public Homepage

Current purpose: explain HomeBase MLS and route users to marketplace, landlord onboarding, and sign-in.

What works: polished, real-data aware, clear audience pathways.

Feels unfinished: needs browser/mobile QA and accessibility review.

Risks: visual/product preview labels could be interpreted as live operational proof.

Recommended improvements: screenshot QA, CTA route QA, accessibility pass.

Priority: Medium.

### Marketplace Search

Current purpose: searchable rental marketplace with filters, saved searches, no-results recovery, and map preview.

What works: URL-backed filters, real data, saved searches, broader-match recovery.

Feels unfinished: no true interactive map; large-scale performance not proven.

Risks: search query performance and mobile filter regressions.

Recommended improvements: add E2E tests and index review; add real map only after location/privacy model.

Priority: High.

### Listing Detail

Current purpose: renter-facing detail page with photos, facts, cost, apply/contact actions.

What works: strong gallery, public availability gating, applicant-aware actions.

Feels unfinished: exact address privacy is not configurable.

Risks: public exact address exposure if future listings require approximate-only display.

Recommended improvements: add address visibility fields before broader marketplace launch.

Priority: High.

### Applicant Apply Flow

Current purpose: authorize reusable packet sharing and submit an application.

What works: clear authorization, readiness checklist, existing-application handling.

Feels unfinished: share preview could be more granular.

Risks: applicants may not fully understand document/profile sharing scope.

Recommended improvements: field-level share preview and share audit log.

Priority: High.

### Tenant Portal

Current purpose: resident operations for lease/rent/maintenance/documents/messages.

What works: first-class `/tenant` route and resident nav.

Feels unfinished: some applicant-era routes remain connected.

Risks: tenant mental model confusion and permission leakage if reused pages are not fully scoped.

Recommended improvements: native tenant subpages and E2E tests.

Priority: High.

### Landlord Dashboard and Operations

Current purpose: property operations, applications, tenant records, inbox, maintenance, reports.

What works: focused first-release nav and many real workflow pages.

Feels unfinished: route breadth remains high; bulk workflows need proof.

Risks: landlords managing many units may hit capped lists or slow pages.

Recommended improvements: server-side pagination and query profiling.

Priority: High.

### Tenant Directory

Current purpose: landlord CRM-like view of authorized tenants/applicants/leads.

What works: scoped to landlord-owned property records, strong cards, profile/share indicators.

Feels unfinished: records are gathered in-memory with `take: 500` and then filtered/sorted.

Risks: scalability and subtle privacy mistakes in detail views.

Recommended improvements: move search/filter/sort into database queries and add authorization tests.

Priority: High.

### Unified Landlord Inbox

Current purpose: one landlord inbox for leads and message threads.

What works: adapter shape is strong and context rich.

Feels unfinished: underlying data is still split.

Risks: unread/reply behavior may diverge across source types.

Recommended improvements: canonical conversation model or stronger adapter tests.

Priority: Medium.

### Maintenance/Vendor

Current purpose: manage repairs, vendor assignments, field updates, invoices.

What works: good model breadth and vendor portal components.

Feels unfinished: full workflow needs field testing.

Risks: payout/invoice/SLA state transitions may be hard to audit without tests.

Recommended improvements: maintenance-to-invoice E2E path.

Priority: High.

### Admin Command Center

Current purpose: platform operations center for access, quality, workflows, integrations, health, security, audit.

What works: real query-backed operations view and super-user model.

Feels unfinished: overlapping admin tables/routes remain.

Risks: operators may not know which admin page is authoritative.

Recommended improvements: convert old admin pages into command-center drilldowns and hide non-release routes.

Priority: High.

## 6. Security and Privacy Findings

### Finding 1: Permission Coverage Is Strong but Not Exhaustively Proven

Files/routes involved:
- `src/lib/authorization.ts`
- `src/app/workflow-actions.ts`
- `src/app/landlord/actions.ts`
- `src/app/applicant/actions.ts`
- `src/app/api/*`

Risk level: High.

Why it matters: Enterprise readiness requires proof that direct URL/action calls cannot access another user’s records.

Recommended fix: Create a permission matrix and test every record-opening route/action with owner and non-owner users.

### Finding 2: Sample Data Download Is Admin-Protected but Not Super-User-Protected

File involved:
- `src/app/admin/system/sample-data/route.ts`

Risk level: Medium.

Why it matters: Sample payloads can include realistic-looking users/properties. Even if not production data, demo data controls should match the super-user-only safety posture.

Recommended fix: Change to `requireSuperUser` or document why normal admins may download it.

### Finding 3: Exact Public Listing Addresses Are Displayed

File involved:
- `src/app/marketplace/[unitId]/page.tsx`

Risk level: Medium.

Why it matters: Some landlords may need approximate location until application/tour approval.

Recommended fix: Add address visibility settings on `Unit` or `Property` and use them in marketplace cards/details/map.

### Finding 4: Property Manager Scoping Needs Real Scenario Tests

Files/models involved:
- `src/lib/authorization.ts`
- `AccountAccessRequest`
- `ProfileConnection`
- `Property`
- `Unit`

Risk level: High.

Why it matters: Property managers must see only assigned/authorized portfolios, not every landlord record.

Recommended fix: Seed multi-landlord/property-manager fixtures and test cross-portfolio denials.

### Finding 5: Lead Access by Email Should Be Reviewed

File involved:
- `src/lib/authorization.ts`, `canAccessLead`

Risk level: Low to Medium.

Why it matters: Email matching is common but weaker than account-linked identity. There is no obvious applicant lead-detail route, but this should be intentional.

Recommended fix: Use email matching only for applicant-facing lead views that intentionally support it; otherwise restrict lead access to owner/admin/application relationships.

## 7. Code Quality Findings

- Dead code: `WorkhorseDashboard` was removed in v4.46; no active import remains.
- Duplicate systems: historical verifier scripts still exist; active `npm run verify` is now focused.
- Bloated pathways: admin pages overlap with Admin Command Center.
- Inconsistent patterns: `AdminPageHeader`, `LandlordPageHeader`, and `ProductPageHeader` coexist.
- Large files: `src/app/marketplace/page.tsx`, `src/lib/dashboard/role-dashboard.ts`, and some admin/landlord pages are candidates for decomposition.
- Fake/mock data: homepage listing counts are real; sample data is separated under `sample-data`. Some preview UI is conceptual but not presented as live metrics.
- TypeScript risk: full typecheck unavailable in this environment.
- Prisma risk: broad schema and dashboard/admin queries need index review.
- Test risk: marker verifiers exist, but behavior and permission tests are not yet comprehensive.

## 8. First Live Release Blockers

### Blocker 1: No Confirmed Typecheck/Test/Build

Why it blocks release: Enterprise release cannot proceed without a clean CI build.

Affected area: Whole app.

Recommended fix: Run `npm install`, `npm run verify`, and `npm run build` in CI or a local npm environment.

Estimated difficulty: Medium.

### Blocker 2: Permission Matrix Not Complete

Why it blocks release: Sensitive renter, landlord, document, ledger, and admin data must be protected against guessed IDs.

Affected area: API routes, server actions, detail pages.

Recommended fix: Build and test a record-level permission matrix.

Estimated difficulty: Large.

### Blocker 3: Property Manager Scoping Not Proven

Why it blocks release: Multi-portfolio access is one of the highest-risk enterprise cases.

Affected area: landlord routes, authorization helpers, account access.

Recommended fix: Add fixtures/tests for manager assigned to one portfolio but not another.

Estimated difficulty: Medium.

### Blocker 4: Mobile QA Not Completed

Why it blocks release: Landlords/vendors/tenants will use phones heavily.

Affected area: marketplace, inbox, maintenance, tenant portal, admin command center.

Recommended fix: Run browser screenshot QA and fix overflow/tap-target issues.

Estimated difficulty: Medium.

### Blocker 5: Sample/Admin Safety Needs Final Policy

Why it blocks release: Admin tools can affect trust and data hygiene.

Affected area: admin system/sample data, command center.

Recommended fix: Super-user-gate sample downloads/controls and document sample tagging strategy.

Estimated difficulty: Small to Medium.

## 9. Recommended Roadmap

### Immediate Release Blockers

- Get CI/npm environment running and pass typecheck/test/build.
- Build permission matrix and guessed-ID test suite.
- Super-user-gate sample data download or document policy.
- Perform mobile screenshot QA on critical routes.

### High-Priority Polish

- Native tenant pages for any applicant-backed resident flows.
- Continue shared header/status/empty-state migration.
- Browser QA for homepage, marketplace, listing detail, apply flow, landlord inbox, tenant directory, maintenance, vendor, admin.

### Workflow Completion

- Canonical messaging model plan.
- Maintenance/vendor E2E flow from request to invoice.
- Inspector report/detail flow.
- Property-manager assignment and access UX.

### Security Hardening

- Add address privacy controls.
- Add audit events for profile-sharing authorization and sensitive detail views.
- Review every server action for `assertCanAccess*` usage.

### Code Cleanup

- Archive historical release docs/scripts not used by first-release gate.
- Split large files by domain.
- Consolidate admin/landlord page headers.

### Admin/Operations Maturity

- Convert command-center cards into authoritative drilldowns.
- Add observability dashboards for errors/jobs/integrations.
- Add backup/recovery documentation.

### Post-Launch Improvements

- Full interactive map.
- Advanced saved-search alerts.
- More granular workflow automation.
- Performance/load testing.

## 10. Next 10 Updates

### 1. CI Build and Verification Recovery

Goal: Make `npm run verify` and `npm run build` pass in a real CI/local npm environment.

Why it matters: No enterprise release without a green build.

Main files: `package.json`, CI config, `scripts/*`, TypeScript/build outputs.

Acceptance criteria: `npm install`, `npm run verify`, and `npm run build` pass from a clean checkout.

Difficulty: Medium.

Dependency order: First.

### 2. Permission Matrix and Guessed-ID Test Suite

Goal: Prove server-side access control for sensitive records.

Why it matters: Prevents cross-landlord/applicant/admin data exposure.

Main files: `src/lib/authorization.ts`, `src/app/**`, `tests/**`.

Acceptance criteria: Tests cover allowed/denied access for applications, documents, photos, tenants, messages, maintenance, inspections, leases, ledger entries.

Difficulty: Large.

Dependency order: After CI works.

### 3. Property Manager Access Scoping

Goal: Validate and refine property-manager portfolio access.

Why it matters: Enterprise users often manage properties they do not own.

Main files: `src/lib/authorization.ts`, `src/lib/dashboard/permissions.ts`, landlord pages, seed/test fixtures.

Acceptance criteria: Property manager can access assigned properties only; denied everywhere else.

Difficulty: Medium.

Dependency order: After permission matrix baseline.

### 4. Mobile Critical Flow QA

Goal: Prove core workflows work on phone-sized screens.

Why it matters: Marketplace, landlord replies, vendor updates, and tenant maintenance are mobile-heavy.

Main files: marketplace, listing detail, applicant apply, landlord inbox, tenant directory, maintenance, vendor, admin command center.

Acceptance criteria: Screenshots show no overflow, usable buttons/forms, readable cards, and working mobile navigation.

Difficulty: Medium.

Dependency order: After CI/browser tooling.

### 5. Tenant Portal Native Flow Completion

Goal: Remove applicant-era mental model from tenant experience.

Why it matters: Residents expect a tenant portal, not an applicant portal.

Main files: `src/app/tenant/*`, `src/app/applicant/*`, tenant navigation.

Acceptance criteria: Tenant lease/rent/maintenance/documents/inbox pages use resident language and direct tenant scoping.

Difficulty: Medium.

Dependency order: After permission tests for tenant data.

### 6. Admin Command Center Drilldown Rationalization

Goal: Make Command Center the authoritative admin home.

Why it matters: Operators need one source of truth.

Main files: `src/app/admin/*`, `src/components/admin/AdminCommandCenter.tsx`, `src/lib/admin/command-center.ts`.

Acceptance criteria: Overlapping admin pages are either drilldowns, hidden from nav, or clearly scoped.

Difficulty: Medium.

Dependency order: After command-center stakeholders review.

### 7. Address Privacy and Location Visibility

Goal: Support exact, approximate, or hidden public listing locations.

Why it matters: Required for some landlords and safety-sensitive rentals.

Main files: `prisma/schema.prisma`, marketplace cards/details, map preview, unit/property forms.

Acceptance criteria: Public views respect address visibility; authorized users still see exact addresses.

Difficulty: Medium.

Dependency order: Before full interactive map launch.

### 8. Canonical Messaging Model Plan and Phase 1

Goal: Reduce split lead/message-thread behavior.

Why it matters: Inbox reliability and unread/reply behavior depend on one model.

Main files: `src/lib/messaging/*`, `prisma/schema.prisma`, inbox pages/actions.

Acceptance criteria: Migration plan documented; new conversations use canonical model or adapter has full tests.

Difficulty: Large.

Dependency order: After current inbox pilot feedback.

### 9. Marketplace Performance and Index Review

Goal: Make search/dashboard queries scale beyond demo data.

Why it matters: Enterprise marketplace must handle many listings/users.

Main files: `prisma/schema.prisma`, `src/lib/marketplace/listings.ts`, dashboard/admin queries.

Acceptance criteria: Index recommendations/migrations added; query plans reviewed for search/filter/dashboard hot paths.

Difficulty: Medium.

Dependency order: Before larger public inventory import.

### 10. Accessibility Audit and Remediation

Goal: Make core workflows keyboard/screen-reader safe.

Why it matters: Public housing platforms must be accessible.

Main files: shared UI, forms, marketplace filters, dashboard shell, inbox, admin command center.

Acceptance criteria: Axe/keyboard checks pass for critical routes; icon buttons and form labels are complete.

Difficulty: Medium.

Dependency order: After mobile QA.

## 11. Verification Results

Checks attempted in this environment:

- `node --experimental-strip-types scripts/check-routes.ts`: **passed**. Output: `Route inventory check scanned 214 app files. Required route check passed.`
- `node scripts/verify-package-cleanliness.mjs`: **passed**. Output: `Package cleanliness check passed: no generated build caches, dependency folders, local env files, logs, or TypeScript incremental caches are packaged.`
- `npm run typecheck`: **blocked**. PowerShell could not find `npm` on PATH: `The term 'npm' is not recognized as the name of a cmdlet, function, script file, or operable program.`
- `npm run lint`: **blocked** for the same missing-`npm` PATH issue.
- `npm run build`: **blocked** for the same missing-`npm` PATH issue.

Why this matters: The platform cannot be declared full-release-ready until typecheck, tests, and build pass in CI or a local environment with npm and dependencies installed.

## 12. Final Recommendation

**Recommendation: Ready for limited pilot after specific blockers are fixed; not ready for full public launch yet.**

HomeBase MLS is credible enough to show to internal stakeholders, selected landlords, agencies, and pilot partners as a serious platform. It should not yet be launched broadly to the public until the build/test pipeline is green, permission coverage is proven, mobile QA is complete, and admin/sample-data safety is tightened.

The right next posture is a controlled pilot with realistic seeded or limited real data, tight admin oversight, and a release-blocker sprint focused on verification, security, mobile usability, and workflow proof.

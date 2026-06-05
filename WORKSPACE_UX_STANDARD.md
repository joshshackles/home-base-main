# HomeBase Workspace UX Standard

HomeBase should feel like one operational platform across every role. The goal is not to make every user see the same information. The goal is to make every role use the same product grammar: one shell, one visual language, one action model, one status system, and one workspace mental model.

Target cross-role UX consistency score: **9/10**.

## North Star

Every primary role workspace should answer four questions immediately:

1. What am I looking at?
2. What is the current status?
3. What needs attention?
4. What can I do next?

The interface should feel like professional operational software, not a collection of unrelated dashboards.

## Canonical Workspace Regions

Use these regions when designing or refactoring authenticated role pages:

| Region | Purpose |
| --- | --- |
| Global Navigation | Product-level navigation, command search, notifications, account controls, and workspace switching. |
| Workflow Navigation | Role-aware left rail or mobile drawer for recurring workflows. |
| Workspace Header | Entity or role identity, status, primary action, secondary action, and optional breadcrumbs. |
| Summary Strip | The few metrics or statuses needed to understand the workspace at a glance. |
| Primary Operational Canvas | Main working surface for records, panels, tables, boards, forms, and workflows. |
| Context Rail | Right-side contextual actions, alerts, related records, messages, notes, and next best actions. |
| Activity Layer | Timeline, audit history, recent changes, and workflow events. |
| Mobile Action Layer | Touch-first quick actions and compact navigation for phones and field users. |

## Canonical Components

The code-level source for this standard is `src/lib/workspace/workspace-ux-standard.ts`.

Current canonical components:

| Component | Location | Use |
| --- | --- | --- |
| `WorkspaceShell` | `src/components/layout/DashboardShell.tsx` | Role-level authenticated shell with collapsible cabinet, command search, mobile drawer, inbox, and quick action. |
| `CommandCenterHeader` | `src/components/ui/CommandCenterPrimitives.tsx` | Shared workspace/entity header. |
| `CommandCenterSurface` | `src/components/ui/CommandCenterPrimitives.tsx` | Large white command-center shell. |
| `CommandCenterPanel` | `src/components/ui/CommandCenterPrimitives.tsx` | Focused workflow panel. |
| `CommandCenterMetric` | `src/components/ui/CommandCenterPrimitives.tsx` | Operational metric card. |
| `CommandCenterButton` | `src/components/ui/CommandCenterPrimitives.tsx` | Primary and secondary workspace actions. |
| `CollapsibleWorkspaceRail` | `src/components/workspace/CollapsibleWorkspaceRail.tsx` | Collapsible right/context rail. |
| `OperationalCanvas` | `src/components/workspace/OperationalCanvas.tsx` | Mode/density-aware workspace module renderer. |

Planned standard components:

| Component | Purpose |
| --- | --- |
| `WorkspaceTabs` | URL-state-aware workflow focus tabs. |
| `NextActionPanel` | Shared role-safe next action panel. |
| `ResponsiveRecordList` | Desktop table plus mobile record cards. |
| `WorkspaceEmptyState` | Action-oriented empty states. |
| `WorkspaceStatusBadge` | Consistent text-first status badges. |

## Role Workspace Templates

Each role should have its own default workspace, but it should still use the same shell and visual system.

### Applicant

Focus: search homes, profile, applications, documents, messages, saved homes.

Primary questions:

- What homes match me?
- What do I need to finish?
- What did I already submit?

Hide until relevant: payments, maintenance, ledger, inspections.

### Tenant

Focus: payments, maintenance, lease, documents, messages, notices.

Primary questions:

- What do I owe?
- Is my repair moving?
- Where are my lease and documents?

Tenant financial language should say `Payments` first. Ledger detail can remain available as account history.

### Voucher Participant

Focus: program status, RFTA, inspection, documents, rent portion, caseworker messages.

Primary questions:

- What is my next program step?
- What paperwork is missing?
- Who am I waiting on?

Do not expose internal HAP accounting, landlord packet internals, or staff-only notes.

### Landlord

Focus: home, inventory, leasing, residents, maintenance, documents and leases, financials, reports.

Primary questions:

- What needs my attention today?
- Which units are vacant or blocked?
- Where can I act quickly?

The landlord command center is the current visual baseline for authenticated workspaces.

### Property Manager

Focus: inventory, residents, maintenance, inspections, documents and leases, financials, reports, team and vendors.

Primary questions:

- Which operational queue is blocked?
- What changed across the portfolio?
- Where do staff need decisions?

Property managers should get denser operational views than simple landlords.

### Leasing Agent

Focus: leads, showings, applications, listings, messages, tasks.

Primary questions:

- Who needs follow-up?
- Which tours are waiting?
- Which applications can move forward?

Hide financial and owner-reporting tools unless explicitly permitted.

### Vendor

Focus: field mode, assigned jobs, estimates, invoices, contacts.

Primary questions:

- What job is next?
- What proof needs uploading?
- What estimate or invoice is pending?

Vendor mobile should be action-first and touch-safe.

### Inspector

Focus: assigned inspections, checklist, reports, corrections, messages.

Primary questions:

- Which inspection is assigned?
- What required items remain?
- What failed or needs evidence?

Inspection flows should not claim official HQS, NSPIRE, or local compliance validation unless the template is legally validated.

### Owner Client

Focus: portfolio, statements, approvals, shared documents, activity, manager messages.

Primary questions:

- How is my property performing?
- What needs approval?
- Where are my statements?

Do not expose applicant PII, internal staff notes, screening reports, or unrelated tenant documents.

### Caseworker

Focus: cases, documents, RFTA, inspections, subsidy status, messages, tasks.

Primary questions:

- Which cases need attention?
- What is missing?
- Which deadlines are near?

Caseworker pages should feel like guided queues, not dense admin lists.

### Housing Authority / Program Admin

Focus: program cases, RFTA review, inspections, HAP/subsidy, payment standards, documents, reports.

Primary questions:

- What program work is blocked?
- Which RFTAs or inspections need review?
- Are payment standards current?

Keep requirements configurable. Do not hardcode one agency's process as universal.

### Admin

Focus: command center, users and access, workflow exceptions, data quality, integrations, reports, audit.

Primary questions:

- What needs operational attention?
- Which users or jobs are blocked?
- What changed recently?

Normal admins should not see super-admin-only destructive tools as primary destinations.

### Super Admin

Focus: platform health, impersonation, API and webhooks, integrations, backups, security, audit, data recovery.

Primary questions:

- Is the platform healthy?
- Which high-risk action needs review?
- What requires a reason and audit trail?

Risky actions should require warnings, reason capture where supported, and audit history.

## Visual Rules

- Use the command-center look as the authenticated product baseline.
- Use dark navy/slate text, blue primary actions, and restrained severity colors.
- Prefer flatter workspace surfaces over stacks of nested cards.
- Major work areas should be white with soft borders and subtle shadows.
- Use 12px to 20px radius for workspace surfaces.
- Keep headings strong, compact, and scannable.
- Put the most important status and action above the fold.
- Use tables where comparison matters and cards where action matters.
- Do not use placeholder or scaffold language in user-facing empty states.
- Do not rely on color alone for status.

## Navigation Rules

- Use `Workspace` as the primary authenticated concept, not `Dashboard`.
- Use role language, not database language.
- Keep normal user navigation simple.
- Group advanced tools below common daily tasks.
- Do not show tenant-style tools to applicants before approval or move-in relevance.
- Do not show platform operations to normal admins.

## Phase 5 Portal Alignment

Phase 5 adds first-class command-center workspaces for caseworkers and housing authority/program admins.

| Workspace | Route | Access Boundary | UX Direction |
| --- | --- | --- | --- |
| Caseworker Workspace | `/caseworker` | `caseworker` workspace access; records are scoped to assigned units/cases. | Guided queues for assigned cases, missing documents, RFTA/packet work, inspections, messages, referrals, and subsidy touchpoints. |
| Housing Authority Workspace | `/housing-authority` | `admin.workflows` capability until a dedicated housing-authority access type is introduced. | Program operations portal for program cases, RFTA review, inspections, subsidy/HAP summaries, payment standards, affordability review, documents, and reports. |

The housing authority portal should remain provider-neutral. It must not hardcode one agency's packet requirements, payment standard rules, or inspection compliance language. When dedicated program-admin/housing-authority roles are added, this route should move from the temporary `admin.workflows` gate to those central scopes.

## Phase 6 Admin Operations Split

Phase 6 separates normal admin operations from super-admin platform operations.

| Workspace | Route | Access Boundary | UX Direction |
| --- | --- | --- | --- |
| Admin Command Center | `/admin` | `admin` workspace access. | Normal operational triage for access requests, workflow exceptions, data quality, integrations, reports, and system health signals. |
| Platform Console | `/admin/platform-operations` | `requireSuperUser()` including explicit, configured, and bootstrap super users. | Protected super-admin home for security, audit, API/webhook/integration posture, backup/recovery, sample data, platform health, and risky-action guardrails. |

Normal admins should not see platform-only tools as primary navigation. Super users can still open normal admin workflows, but high-risk operational controls should be grouped into the platform console and linked to source pages that enforce their own permissions, confirmations, reason capture, and audit trails.

## Phase 7 Participant And Owner Views

Phase 7 adds missing first-class role views for program participants and owner-style executive review.

| Workspace | Route | Access Boundary | UX Direction |
| --- | --- | --- | --- |
| Participant Workspace | `/participant` | Authenticated user; records are scoped to the user's own applications, email, tenant units, documents, inspections, and lease packets. | Plain-language program milestones for paperwork, RFTA packet status, inspection, lease/signature tasks, rent portion, and caseworker messages. |
| Owner Workspace | `/owner` | `landlord` workspace access; records are scoped to properties owned by the signed-in landlord account. | Executive portfolio view for occupancy, financial summary, statements, maintenance approvals, shared documents, activity, and manager communication. |

Participant views must not expose internal HAP accounting, staff-only notes, landlord packet internals, or confidential program review data. Owner views must not expose applicant screening reports, internal staff notes, unrelated tenant documents, or detailed applicant PII.
- Preserve legacy routes, but guide users toward canonical workflows.

## Canonical Role Navigation

The canonical navigation maps live in `src/lib/navigation/first-release.ts`.

The first normalized pass uses these principles:

| Role | Primary navigation focus |
| --- | --- |
| Applicant | Workspace, Search Homes, Saved Homes, Profile, Applications, Documents, Messages. |
| Tenant | Workspace, Payments, Maintenance, Lease, Messages, Documents, Notices, Inspections, Account History. |
| Simple landlord | Home, Inventory, Applications, Messages, Maintenance, Payments, Residents, Listings, Documents & Leases, Reports. |
| Property manager | Workspace, Inventory, Operational Queues, Residents, Leases, Documents, Leasing, Maintenance, Financials, Advanced. |
| Leasing agent | Leads, Showings, Applications, Listings, Messages, Tasks, Screening. |
| Vendor | Field Mode, Assigned Jobs, Estimates, Invoices, Contacts. |
| Inspector | Workspace, Assigned Inspections, Reports & Corrections. |
| Admin | Command Center, Users & Access, Workflow Exceptions, Data Quality, Integration Status, System Health, Operations, Reports. |
| Super admin | Platform Operations, Security, Audit Logs, Sample Data, and high-risk system tools. |

When introducing a new role route, add it to the role's canonical group rather than creating a new top-level destination.

Phase 4 implementation note: vendor and inspector workspaces use the shared `RoleDashboard` command-center shell. Owner-client remains a planned first-class portal because the current route inventory does not yet include a dedicated `/owner` or `/owner-client` workspace.

## Entity Workspace Rules

Every entity detail page should eventually follow the same structure:

1. Entity header
2. Status and summary strip
3. Workflow tabs or mode switcher
4. Primary operational canvas
5. Context rail
6. Activity layer

Canonical entity workspaces:

- Property
- Unit
- Applicant
- Tenant
- Lease
- Maintenance request
- Inspection
- Document
- Payment or ledger record
- Program case
- RFTA
- Vendor job

## Empty State Rules

An empty state should include:

1. What is missing.
2. Why it matters.
3. One clear next action when the user can act.

Use:

> No documents have been shared for this unit yet. Upload a lease, notice, inspection report, or maintenance attachment when it is ready.

Avoid:

> Documents will appear here.

## Mobile Rules

Mobile should not be a shrunken desktop.

- Tables become record cards.
- Context rails become drawers or stacked panels.
- Tabs become horizontal scroll or compact jump menus.
- Primary actions stay easy to reach.
- Tap targets should be at least 44px tall.
- Field users should see camera, notes, status, and submit actions first.

## Cross-Role UX Audit Criteria

Every primary role workspace should be scored from 1 to 10 on:

1. Visual consistency
2. Navigation clarity
3. Next-action clarity
4. Workflow usefulness
5. Mobile usability
6. Language polish
7. Permission safety
8. State quality
9. Status clarity
10. Activity context

Release target:

- No primary role below 8.
- Landlord, tenant, applicant, admin, and vendor at 9 or higher.
- No primary role surface using an unrelated visual system.
- No primary role home still behaving like a static dashboard.

## Implementation Rule

When updating a role page, do not create a new local visual system. Use the canonical workspace components or add the missing primitive to the shared system first.

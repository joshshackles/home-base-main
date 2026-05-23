# HomeBase MLS Workspace Engine Architecture

HomeBase MLS should treat workspaces as an operational interface system for every workflow in the platform, not as customizable dashboards or page collections.

The workspace engine exists to answer one question:

> Given this actor, entity, workflow stage, device, urgency, permissions, and operational context, what should the user see and be able to do next?

## Product Principle

Pages are delivery surfaces. Workspaces are operational views of platform entities.

HomeBase should avoid building isolated pages that own business logic. Instead, the platform should define shared entities, relationships, events, workflows, widgets, panels, commands, permissions, automations, and activity streams. Web, mobile, admin, vendor, program, owner, API, and future white-label surfaces should render different views of the same platform model.

## Core Primitives

### Entity

An entity is a durable platform object that can own workflows, permissions, events, relationships, widgets, panels, commands, and activity.

Initial workspace entities:

- property
- unit
- tenant
- applicant
- lead
- application
- lease
- ledger account
- payment
- maintenance request
- work order
- inspection
- document
- message thread
- organization
- owner statement
- vendor invoice
- program case
- voucher
- HAP contract
- certification packet

Each entity should eventually define:

- stable entity type
- canonical display label
- canonical route
- primary permissions
- relationship loaders
- supported workspace modes
- supported widgets
- supported commands
- timeline/event mapping

### Relationship

Relationships describe how entities know about each other.

Example: a unit should know its property, listing state, tenant, applications, leads, lease packets, ledger entries, maintenance requests, inspections, documents, messages, staff assignments, caseworker/program relationships, and timeline events.

Relationship helpers should live in platform services, not UI components.

### Event

Every important platform action should emit a typed event.

Examples:

- `lead.created`
- `application.submitted`
- `lease.sent_for_signature`
- `lease.signed`
- `payment.posted`
- `rent.overdue`
- `maintenance.assigned`
- `inspection.failed`
- `document.uploaded`
- `voucher.expiring`
- `message.received`

Events should feed:

- activity streams
- timelines
- audit logs
- notifications
- automation rules
- analytics
- AI recommendations
- workspace alerts

The event system is the platform nervous system.

### Workflow

A workflow defines valid stages, actions, next steps, permissions, events, and automation hooks for a business process.

Examples:

- leasing pipeline
- application review
- lease signature
- rent billing
- maintenance dispatch
- inspection correction
- RFTA packet review
- HAP/subsidy reconciliation
- certification/recertification

Workflow rules belong in backend/platform services. Frontends render workflow state and submit commands.

### Workspace

A workspace is a contextual operating surface for an entity or workflow.

Examples:

- Unit Workspace
- Work Order Workspace
- Application Review Workspace
- Inspection Workspace
- Program Case Workspace
- Owner Portfolio Workspace
- Admin Operations Workspace

A workspace should be able to adapt to:

- actor role
- permissions
- entity type
- entity state
- workflow stage
- device size
- urgency
- related records
- user preferences
- AI recommendations later

### Workspace Mode

A mode changes the priority and layout of widgets, panels, actions, and context.

Initial modes:

- `overview`
- `leasing`
- `resident`
- `financial`
- `maintenance`
- `inspection`
- `documents`
- `communication`
- `executive`
- `compliance`
- `mobile_field`

Modes are not separate pages. They are operational states of a workspace.

### Widget

Widgets are micro-applications, not simple cards.

A widget may include:

- forms
- tables
- filters
- timelines
- media uploads
- message composer
- approval controls
- signature status
- maps
- kanban boards
- document preview
- financial summaries
- AI suggestions later

Widgets must declare:

- entity support
- data dependencies
- required permissions
- supported modes
- actions emitted
- events consumed

### Panel

Panels are reusable workspace surfaces for focused work without leaving context.

Panel types:

- side drawer
- stacked panel
- split pane
- detail inspector
- modal editor
- docked activity panel
- mobile bottom sheet

Examples:

- open application review while staying in Unit Workspace
- preview document
- assign vendor
- schedule inspection
- send message
- approve invoice
- edit lease packet

### Command

Commands are entity-aware actions exposed through buttons, command palette, keyboard shortcuts, automation, API, and future mobile actions.

Examples:

- message tenant
- create repair
- assign vendor
- review application
- schedule inspection
- upload document
- record payment
- generate lease
- export ledger
- request missing document

Every command must enforce permissions in the platform layer.

### Workspace Memory

Workspace memory captures operational preferences and repeated behavior.

Examples:

- preferred mode by role/entity
- frequently opened widgets
- saved filters
- saved layouts
- repeated commands
- abandoned workflows
- records often viewed together

Workspace memory should eventually power suggestions such as:

> You usually review pending inspections after failed inspection notices. Open inspection focus?

## Workspace Context Resolver

The resolver is the core engine.

Input:

- actor
- entity type
- entity id
- requested mode
- route/source
- device profile
- permissions
- current workflow state
- urgency signals
- user workspace memory

Output:

- resolved workspace mode
- visible widgets
- prioritized widgets
- available commands
- primary actions
- secondary actions
- alerts
- panels
- relationship summaries
- activity stream
- empty states

Target API shape:

```ts
const context = await resolveWorkspaceContext(ctx, {
  entity: { type: "unit", id: unitId },
  requestedMode: "maintenance",
  source: "web"
});
```

## First Implementation Targets

### 1. Unit Workspace

The current Unit/Property Workspace should become the first proof of the engine.

It should consume:

- unit entity definition
- unit relationship graph
- workspace mode definitions
- widget registry
- command registry
- activity stream
- alerts

### 2. Work Order Workspace

The work order workspace should prove the engine works outside leasing/property management.

It should prioritize:

- tenant issue
- unit/property context
- access notes
- vendor assignment
- media evidence
- status transitions
- estimates/invoices
- timeline
- communication

### 3. Application Review Workspace

Application review should prove the engine can handle sensitive workflows.

It should prioritize:

- applicant profile
- household
- documents
- screening status
- missing items
- fair-housing-safe decisions
- messages
- timeline
- permissions

## Non-Goals For The First Pass

- Drag-and-drop layout builder
- Organization template marketplace
- AI automation
- real-time collaboration
- mobile native implementation
- full event migration

These are future capabilities. The first pass should establish the primitives and prove that workspaces can be generated from shared platform definitions.

## Design Rules

- Workspaces are dense but readable.
- The selected mode should change priority, not hide critical context.
- Mobile is not a shrunken desktop. Mobile modes should be action-first, camera-ready, and touch-friendly.
- Empty states must explain the operational purpose of the area.
- Risky commands must show audit/permission cues.
- Internal names may preserve legacy compatibility, but user-facing language should say workspace.

## Architecture Rules

- Workspace data loads through platform services.
- Permission checks live in platform policies/services.
- Workflow transitions live in workflow/domain services.
- Events are emitted by commands, not by visual components.
- Widgets declare dependencies instead of querying arbitrarily.
- Activity streams are built from events and canonical relationship helpers.
- UI components render resolved context, actions, widgets, and panels.

## Update Sequence

1. Workspace engine architecture.
2. Core workspace TypeScript primitives.
3. Entity registry.
4. Relationship graph helpers.
5. Universal event model.
6. Activity stream builder.
7. Workspace context resolver.
8. Widget registry.
9. Panel system.
10. Command registry.
11. Workspace modes.
12. Refactor Unit Workspace onto the engine.
13. Apply engine to Work Order Workspace.
14. Release QA and workspace developer guide.

## Current Implementation Status

- Update 1 created this architecture definition.
- Update 2 added the shared TypeScript contract in `src/lib/workspace/types.ts` and public exports in `src/lib/workspace/index.ts`.
- Update 3 added the canonical entity registry in `src/lib/workspace/entity-registry.ts`, including entity labels, routes, supported modes, permission requirements, relationship definitions, and first-pass widget/command keys.
- Update 4 added relationship graph helpers in `src/lib/workspace/relationship-graph.ts`, including inbound/outbound edges, adjacency, relationship lookup, path discovery, relationship summaries, and stable relationship signatures.
- Update 5 added the universal workspace event registry in `src/lib/workspace/event-registry.ts`, including typed event definitions, categories, audiences, audit/timeline/automation flags, event factory helpers, and activity item conversion.
- Update 6 added the shared activity stream builder in `src/lib/workspace/activity-stream.ts`, including timeline filtering, audience-sensitive views, grouping, counts, previews, pagination windows, and date summaries.
- Update 7 added the first workspace context resolver in `src/lib/workspace/context-resolver.ts`, including actor permission resolution, mode fallback, urgency calculation, activity stream composition, relationship summaries, baseline actions, and access alerts.
- Update 8 added the workspace widget registry in `src/lib/workspace/widget-registry.ts`, including reusable widget definitions, data dependencies, actions, entity/mode support, permission filtering, and resolver integration.
- Update 9 added the workspace panel registry in `src/lib/workspace/panel-registry.ts`, including drawers, inspectors, split panes, docks, modals, bottom sheets, permission filtering, and resolver integration.
- Update 10 added the workspace command registry in `src/lib/workspace/command-registry.ts`, including command definitions, categories, entity/mode support, permission filtering, audit flags, and resolver integration.
- Update 11 added the workspace mode registry in `src/lib/workspace/mode-registry.ts`, including mode metadata, intents, preferred surfaces/devices, compact rules, and mode-aware ranking for widgets, panels, and commands.

## Success Criteria

HomeBase should feel less like many pages and more like one operational platform where every role opens the right entity workspace, sees the right context, and can take the right action without hunting across unrelated screens.

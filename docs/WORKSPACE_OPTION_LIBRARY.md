# Workspace Option Library

The workspace option library is the inventory layer for future operational canvases. It does not redesign every screen by itself. It defines what a workspace may show, where each option belongs, which entities and modes it supports, what density modes it works in, and how future drag-and-drop or saved layouts can reference it.

## Files

- `src/lib/workspace/workspace-modes.ts`
- `src/lib/workspace/workspace-options.ts`
- `src/lib/workspace/workspace-registries.ts`
- `src/lib/workspace/operational-canvas.ts`

## Regions

The option library currently focuses on three major workspace regions:

- Workflow Navigation Layer
- Primary Operational Canvas
- Contextual Intelligence Sidebar

Floating utility support is represented in the types and template structure so command consoles, drawers, message overlays, and inspectors can be added without changing the template shape later.

## What Options Include

Each option includes:

- id
- label
- description
- region
- category
- supported modes
- supported density modes
- allowed entity types
- required permissions
- default size
- minimum size
- preferred placement
- representation types
- priority
- experimental/default flags

## Expanded Modes

The option layer supports a broader mode vocabulary than the first engine pass:

- Leasing Mode
- Maintenance Mode
- Inspection Mode
- Financial Mode
- Executive Mode
- Communication Mode
- Property Management Mode
- Tenant Services Mode
- Compliance Mode
- Field Staff Mode
- Admin Operations Mode
- Public Listing Mode
- Application Review Mode
- Lease-Up Mode
- Emergency Response Mode

The existing workspace resolver can still use legacy modes such as `resident` and `mobile_field`; `normalizeWorkspaceOptionMode()` maps those into the option-library vocabulary.

## Density Modes

The option layer supports:

- Simple Daily View
- Comfortable
- Operational
- Analyst
- Command Center
- Field Mobile
- Executive Summary
- Spreadsheet Heavy
- Focus Mode
- Presentation Mode

Density affects snap grid metadata and later should affect row height, module chrome, tool visibility, and default workspace templates.

## Template Strategy

Default templates are built with:

- `buildDefaultWorkspaceTemplate(entityType, mode, density)`

This returns option ids for:

- workflow navigation
- primary canvas
- contextual sidebar
- floating utilities

Templates should reference option ids, not hardcoded component names. That is what will eventually make saved layouts, role-specific defaults, and organization templates reliable.

## Verification

Run:

```bash
npm run workspace-engine:verify
```

The verifier checks:

- unique option ids
- valid option regions
- supported modes
- representation types
- template references
- operational canvas module resolution


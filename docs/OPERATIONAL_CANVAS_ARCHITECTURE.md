# HomeBase Operational Canvas Architecture

HomeBase workspaces should evolve from stacked dashboards into operational canvases. The canvas is the application surface where entity context, workflow mode, command actions, activity, panels, and data views are arranged for the task at hand.

## Canvas Layers

The target workspace model has five layers:

- Global navigation layer: command bar, universal search, notifications, workspace switcher, command palette.
- Workflow navigation layer: role-aware modes, workflow queues, entity focus, saved views.
- Primary operational canvas: spreadsheet, kanban, timeline, map, media, checklist, ledger, and form modules.
- Contextual intelligence layer: alerts, activity, recommendations, related records, audit cues, and side inspectors.
- Floating utility layer: quick actions, message overlays, drawers, bottom consoles, and inline editors.

## Core Primitives

The code foundation starts in:

- `src/lib/workspace/operational-canvas.ts`
- `src/components/workspace/OperationalCanvas.tsx`

The model introduces:

- `WorkspaceDensityMode`
- `WorkspaceCanvasRegion`
- `WorkspaceModuleRepresentation`
- `WorkspaceCanvasModule`
- `WorkspaceCanvasTemplate`
- `WorkspaceOperationalCanvasModel`

These primitives let a single entity be represented as:

- compact strip
- operational panel
- spreadsheet
- kanban
- timeline
- map
- inspector
- media board
- document preview
- message thread
- form flow

## Density Modes

HomeBase should support multiple operating densities:

- Comfortable: guided, lower-density layouts for occasional users.
- Operational: balanced professional density for daily operations.
- Analyst: dense table and comparison views for power users.
- Command Center: high-density mission-control views for large portfolios and urgent queues.

Density should affect row height, gutters, module density, and eventually default layout persistence.

## Mode-Driven Templates

Every workspace mode receives a default canvas template:

- Overview
- Leasing
- Resident
- Financial
- Maintenance
- Inspection
- Documents
- Communication
- Executive
- Compliance
- Mobile field

Modes decide layout priority. They should not hide essential context or bypass permissions.

## Design Direction

The canvas visual direction should move away from nested cards and toward:

- flatter surfaces
- fewer borders
- lower-radius panels
- subtle grid/canvas background
- clearer hierarchy between rails, canvas, and context
- spreadsheet/kanban/timeline density where appropriate
- docked and floating panels instead of standalone pages

Cards may still exist, but they should be modules inside a larger operational surface rather than the dominant page metaphor.

## Migration Rules

When migrating a page to the operational canvas:

1. Keep the existing platform service as the data source.
2. Resolve entity context through the workspace engine.
3. Build an operational canvas model with `buildOperationalCanvasModel()`.
4. Render the page through `OperationalCanvas` or a specialized canvas shell.
5. Convert widgets into modules, not page-specific cards.
6. Use command action bindings for buttons and command palette items.
7. Keep record-level permissions in platform services.
8. Keep workflow transitions out of React components.

## Current Status

The first implementation pass wires the landlord Unit Workspace engine model to an `operationalCanvas` object. The visible page still preserves its current layout, but it now exposes resolved canvas density, modules, regions, and representations. Future updates should progressively replace stacked regions with the operational canvas shell.


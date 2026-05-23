# Workspace Engine Developer Guide

HomeBase workspaces should be built from shared platform primitives, not from isolated page logic. A workspace is an operational view of an entity, and every frontend should render the same resolved model wherever possible.

## Golden Rule

Do not put workflow rules in page components.

Page components may render layout, collect input, show loading/error/empty states, and call actions. They should not decide business eligibility, command safety, record ownership, audit behavior, workflow transitions, or event semantics.

## Workspace Build Flow

1. Define or reuse an entity in `src/lib/workspace/entity-registry.ts`.
2. Confirm relationships are represented in `src/lib/workspace/relationship-graph.ts`.
3. Register timeline/audit events in `src/lib/workspace/event-registry.ts`.
4. Register reusable widgets in `src/lib/workspace/widget-registry.ts`.
5. Register focused panels in `src/lib/workspace/panel-registry.ts`.
6. Register commands in `src/lib/workspace/command-registry.ts`.
7. Add mode priority in `src/lib/workspace/mode-registry.ts`.
8. Resolve the model through `resolveWorkspaceContext()`.
9. Bind commands to surface-specific routes with `bindWorkspaceCommandsToActions()`.
10. Render the resolved model in the web, mobile, admin, vendor, owner, or program frontend.

## Adapter Pattern

Adapters connect an existing platform service model to the generic workspace engine. The first production adapter is:

- `src/lib/workspace/adapters/landlord-unit-workspace.ts`

An adapter should:

- receive a platform service model
- map page focus or tab state to a workspace mode
- derive events from real records
- call `resolveWorkspaceContext()`
- bind commands to known routes or disabled action states
- return one resolved model to the UI

Adapters should not:

- query unrelated records directly from UI components
- bypass central permission checks
- mutate records
- invent command behavior not registered in the command registry
- hide missing route bindings silently

## Command Actions

Commands are platform actions. Action bindings are surface-specific presentation instructions.

Use:

- `WorkspaceCommand` for the reusable platform command definition
- `WorkspaceBoundCommandAction` for a route-aware UI action
- `bindWorkspaceCommandsToActions()` to map commands into clickable or disabled actions

This lets the same command appear in:

- web workspace buttons
- mobile quick actions
- admin command palettes
- future public APIs
- automation runners

## Events And Activity

Events should be emitted by platform commands and domain services over time. During transition, adapters may derive events from existing records so timelines and workspace alerts can use the shared activity stream.

Every new event should be checked for:

- audience
- sensitivity
- audit evidence
- timeline visibility
- automation eligibility
- related entities

## Permission Rules

Workspace permission requirements are declarative. They describe what capability is needed for the entity, widget, panel, or command. They do not replace record-level ownership checks.

Use the platform service or route guard to prove record ownership and scope first. Then let the workspace resolver filter commands, widgets, panels, and alerts for the current role and permission set.

## UI Rules

Workspace UI should:

- preserve context while focus modes change
- show active mode and urgency
- make next actions obvious
- show audit cues for risky actions
- provide disabled reasons instead of dead controls
- keep mobile views action-first
- keep dense enterprise views readable

Workspace UI should not:

- duplicate workflow logic
- hide platform limitations with vague placeholder copy
- expose sensitive details just because an entity is related
- make users leave the workspace for every small action when a panel would work better

## Verification

Run:

```bash
npm run workspace-engine:verify
```

This checks that:

- entity widget references resolve
- entity command references resolve
- widget and panel action references resolve
- a landlord unit workspace context can resolve widgets and commands
- command action binding still works
- architecture docs mention the current update


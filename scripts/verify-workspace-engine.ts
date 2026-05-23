import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bindWorkspaceCommandsToActions,
  getMissingWorkspaceCommandKeys,
  getMissingWorkspaceWidgetKeys,
  getWorkspaceEntityCommandKeys,
  getWorkspaceEntityWidgetKeys,
  landlordUnitWorkspaceTabToMode,
  resolveWorkspaceContext,
  workspaceCommandRegistry,
  workspaceEntityTypes,
  workspacePanelRegistry,
  workspaceWidgetRegistry
} from "@/lib/workspace";
import type { PlatformActor } from "@/lib/platform/types";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertContains(path: string, needle: string) {
  const contents = read(path);
  assert(contents.includes(needle), `${path} is missing ${needle}`);
}

for (const entityType of workspaceEntityTypes) {
  const missingWidgets = getMissingWorkspaceWidgetKeys(getWorkspaceEntityWidgetKeys(entityType));
  const missingCommands = getMissingWorkspaceCommandKeys(getWorkspaceEntityCommandKeys(entityType));
  assert(missingWidgets.length === 0, `${entityType} references missing workspace widgets: ${missingWidgets.join(", ")}`);
  assert(missingCommands.length === 0, `${entityType} references missing workspace commands: ${missingCommands.join(", ")}`);
}

for (const [widgetKey, widget] of Object.entries(workspaceWidgetRegistry)) {
  const missingActions = (widget.actions ?? []).filter((action) => !workspaceCommandRegistry[action]);
  assert(missingActions.length === 0, `${widgetKey} references missing workspace commands: ${missingActions.join(", ")}`);
}

for (const [panelKey, panel] of Object.entries(workspacePanelRegistry)) {
  const missingActions = (panel.actions ?? []).filter((action) => !workspaceCommandRegistry[action]);
  assert(missingActions.length === 0, `${panelKey} references missing workspace commands: ${missingActions.join(", ")}`);
}

const actor: PlatformActor = {
  userId: "workspace-verify-user",
  email: "workspace-verify@example.com",
  name: "Workspace Verify",
  role: "LANDLORD"
};

const resolved = resolveWorkspaceContext({
  actor,
  entity: { type: "unit", id: "unit-verify" },
  requestedMode: landlordUnitWorkspaceTabToMode("maintenance"),
  surface: "web",
  device: "desktop",
  permissions: [
    "landlord.units",
    "landlord.listings",
    "landlord.applications",
    "landlord.maintenance",
    "landlord.inspections",
    "landlord.documents",
    "landlord.inbox",
    "landlord.ledger",
    "landlord.payments"
  ]
});

assert(resolved.canAccess, "Landlord unit workspace should resolve as accessible with landlord.units.");
assert(resolved.context.resolvedMode === "maintenance", "Unit maintenance tab should resolve maintenance mode.");
assert(resolved.widgets.length > 0, "Resolved unit workspace should include widgets.");
assert(resolved.commands.length > 0, "Resolved unit workspace should include commands.");

const actionBindings = bindWorkspaceCommandsToActions({
  commands: resolved.commands,
  entity: resolved.context.entity,
  mode: resolved.context.resolvedMode,
  canAccess: resolved.canAccess,
  routeForCommand: ({ command }) => `/verify/${command.key}`
});

assert(actionBindings.length === resolved.commands.length, "Every resolved command should become an action binding.");
assert(actionBindings.every((action) => action.href?.startsWith("/verify/")), "Bound actions should preserve route bindings.");

assertContains("docs/WORKSPACE_ENGINE_ARCHITECTURE.md", "Update 14");
assertContains("docs/WORKSPACE_ENGINE_DEVELOPER_GUIDE.md", "Do not put workflow rules in page components");
assertContains("src/lib/workspace/action-bindings.ts", "bindWorkspaceCommandsToActions");
assertContains("src/lib/workspace/adapters/landlord-unit-workspace.ts", "commandActions");

console.log("Workspace engine verification passed.");


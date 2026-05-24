import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bindWorkspaceCommandsToActions,
  buildOperationalCanvasModel,
  buildDefaultWorkspaceTemplate,
  buildWorkspaceOptionRegistry,
  getMissingWorkspaceCommandKeys,
  getMissingWorkspaceWidgetKeys,
  getWorkspaceEntityCommandKeys,
  getWorkspaceEntityWidgetKeys,
  landlordUnitWorkspaceTabToMode,
  resolveWorkspaceContext,
  workspaceCommandRegistry,
  workspaceDensityDefinitions,
  workspaceEntityTypes,
  workspaceOptionDefinitions,
  workspaceOptionModes,
  workspacePanelRegistry,
  workspaceTemplateDefinitions,
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

const optionRegistry = buildWorkspaceOptionRegistry();
const optionIds = new Set<string>();
const validRegions = new Set(["workflow_navigation", "primary_canvas", "context_sidebar", "floating_utility"]);
const validModes = new Set(workspaceOptionModes.map((mode) => mode.id));
const validDensities = new Set(workspaceDensityDefinitions.map((density) => density.id));

for (const option of workspaceOptionDefinitions) {
  assert(!optionIds.has(option.id), `Duplicate workspace option id: ${option.id}`);
  optionIds.add(option.id);
  assert(validRegions.has(option.region), `${option.id} has invalid region ${option.region}`);
  assert(option.supportedModes.length > 0, `${option.id} must support at least one mode.`);
  assert(option.supportedModes.every((mode) => validModes.has(mode)), `${option.id} references an unknown mode.`);
  assert(option.supportedDensityModes.length > 0, `${option.id} must support at least one density mode.`);
  assert(option.supportedDensityModes.every((density) => validDensities.has(density)), `${option.id} references an unknown density mode.`);
  assert(option.representationTypes.length > 0, `${option.id} must include at least one representation type.`);
}

for (const template of workspaceTemplateDefinitions) {
  const referencedIds = [
    ...template.workflowNavigation,
    ...template.primaryCanvas,
    ...template.contextSidebar,
    ...template.floatingUtilities
  ];
  assert(referencedIds.length > 0, `${template.id} must reference registered options.`);
  for (const optionId of referencedIds) {
    assert(optionRegistry.byId.has(optionId), `${template.id} references missing option ${optionId}.`);
  }
}

const generatedTemplate = buildDefaultWorkspaceTemplate("unit", "maintenance", "operational");
for (const optionId of [
  ...generatedTemplate.workflowNavigation,
  ...generatedTemplate.primaryCanvas,
  ...generatedTemplate.contextSidebar,
  ...generatedTemplate.floatingUtilities
]) {
  assert(optionRegistry.byId.has(optionId), `Generated template references missing option ${optionId}.`);
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

const canvas = buildOperationalCanvasModel({ workspace: resolved });
assert(canvas.template.mode === "maintenance", "Operational canvas should inherit the resolved workspace mode.");
assert(canvas.density === "operational", "Maintenance canvas should default to operational density.");
assert(canvas.modules.length > 0, "Operational canvas should contain modules.");
assert(canvas.primaryModules.length > 0, "Operational canvas should include primary canvas modules.");
assert(canvas.snapGrid.columns === 12, "Desktop operational canvas should expose a 12-column snap grid.");
assert(canvas.modules.some((module) => module.source === "option"), "Operational canvas should resolve modules from registered workspace options.");

assertContains("docs/WORKSPACE_ENGINE_ARCHITECTURE.md", "Update 14");
assertContains("docs/WORKSPACE_ENGINE_ARCHITECTURE.md", "Update 15");
assertContains("docs/WORKSPACE_ENGINE_ARCHITECTURE.md", "Update 16");
assertContains("docs/WORKSPACE_ENGINE_DEVELOPER_GUIDE.md", "Do not put workflow rules in page components");
assertContains("docs/OPERATIONAL_CANVAS_ARCHITECTURE.md", "WorkspaceDensityMode");
assertContains("docs/WORKSPACE_OPTION_LIBRARY.md", "Workspace Option Library");
assertContains("docs/LANDLORD_WORKSPACE_EXPECTATIONS.md", "Edit Anything From Anywhere");
assertContains("docs/LANDLORD_WORKSPACE_EXPECTATIONS.md", "Three-Zone Workspace Standard");
assertContains("docs/LANDLORD_WORKSPACE_EXPECTATIONS.md", "Property Workspace");
assertContains("src/lib/workspace/action-bindings.ts", "bindWorkspaceCommandsToActions");
assertContains("src/lib/workspace/operational-canvas.ts", "buildOperationalCanvasModel");
assertContains("src/lib/workspace/workspace-registries.ts", "buildWorkspaceOptionRegistry");
assertContains("src/lib/workspace/workspace-registries.ts", "getWorkflowNavForRole");
assertContains("src/lib/workspace/workspace-registries.ts", "buildDefaultWorkspaceTemplate");
assertContains("src/components/workspace/OperationalCanvas.tsx", "OperationalCanvas");
assertContains("src/lib/workspace/adapters/landlord-unit-workspace.ts", "commandActions");
assertContains("src/lib/workspace/adapters/landlord-unit-workspace.ts", "operationalCanvas");

console.log("Workspace engine verification passed.");

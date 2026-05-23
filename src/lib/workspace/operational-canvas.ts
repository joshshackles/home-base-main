import type {
  WorkspacePanelDefinition,
  WorkspaceResolvedModel,
  WorkspaceWidgetDefinition,
  WorkspaceWidgetKind
} from "@/lib/workspace/types";
import type { WorkspaceOptionDefinition, WorkspaceRepresentationType } from "@/lib/workspace/workspace-options";
import type { WorkspaceDensityMode, WorkspaceOptionMode } from "@/lib/workspace/workspace-modes";
import { getWorkspaceDensityDefinition, normalizeWorkspaceOptionMode, workspaceOptionModes } from "@/lib/workspace/workspace-modes";
import { buildDefaultWorkspaceTemplate, buildWorkspaceOptionRegistry, normalizeEntityType } from "@/lib/workspace/workspace-registries";

export type WorkspaceCanvasRegion =
  | "global_nav"
  | "workflow_nav"
  | "primary_canvas"
  | "context_sidebar"
  | "floating_utility"
  | "bottom_console";

export type WorkspaceModuleRepresentation =
  | "compact_strip"
  | "operational_panel"
  | "spreadsheet"
  | "kanban"
  | "timeline"
  | "map"
  | "inspector"
  | "media_board"
  | "document_preview"
  | "message_thread"
  | "form_flow";

export type WorkspaceCanvasModule = {
  key: string;
  label: string;
  source: "option" | "widget" | "panel";
  sourceKey: string;
  region: WorkspaceCanvasRegion;
  representation: WorkspaceModuleRepresentation;
  minColumnSpan: number;
  defaultColumnSpan: number;
  minRowSpan: number;
  defaultRowSpan: number;
  collapsible: boolean;
  resizable: boolean;
  dockable: boolean;
  lazy: boolean;
  priority: number;
};

export type WorkspaceCanvasTemplate = {
  key: string;
  label: string;
  mode: WorkspaceOptionMode;
  density: WorkspaceDensityMode;
  description: string;
  columns: number;
  regions: WorkspaceCanvasRegion[];
};

export type WorkspaceOperationalCanvasModel = {
  template: WorkspaceCanvasTemplate;
  density: WorkspaceDensityMode;
  snapGrid: {
    columns: number;
    rowHeight: number;
    gutter: number;
  };
  modules: WorkspaceCanvasModule[];
  primaryModules: WorkspaceCanvasModule[];
  contextualModules: WorkspaceCanvasModule[];
  utilityModules: WorkspaceCanvasModule[];
};

export const workspaceDensitySettings = Object.fromEntries(
  ([
    "simple_daily",
    "comfortable",
    "operational",
    "analyst",
    "command_center",
    "field_mobile",
    "executive_summary",
    "spreadsheet_heavy",
    "focus",
    "presentation"
  ] as WorkspaceDensityMode[]).map((densityMode) => [densityMode, getWorkspaceDensityDefinition(densityMode)])
) as Record<WorkspaceDensityMode, ReturnType<typeof getWorkspaceDensityDefinition>>;

export const workspaceCanvasTemplates = Object.fromEntries(
  workspaceOptionModes.map((modeDefinition) => [
    modeDefinition.id,
    canvasTemplate(modeDefinition.id, `${modeDefinition.label.replace(" Mode", "")} canvas`, modeDefinition.id, modeDefinition.defaultDensity, modeDefinition.description)
  ])
) as Record<WorkspaceOptionMode, WorkspaceCanvasTemplate>;

export function buildOperationalCanvasModel(input: {
  workspace: WorkspaceResolvedModel;
  density?: WorkspaceDensityMode;
}): WorkspaceOperationalCanvasModel {
  const optionMode = normalizeWorkspaceOptionMode(input.workspace.context.resolvedMode);
  const density = input.density ?? workspaceCanvasTemplates[optionMode].density;
  const densitySettings = workspaceDensitySettings[density];
  const entityType = normalizeEntityType(input.workspace.context.entity.type);
  const registry = buildWorkspaceOptionRegistry();
  const defaultTemplate = buildDefaultWorkspaceTemplate(entityType, optionMode, density);
  const template = {
    ...workspaceCanvasTemplates[optionMode],
    key: defaultTemplate.id,
    label: defaultTemplate.label,
    density
  };
  const moduleOptionIds = [
    ...defaultTemplate.workflowNavigation,
    ...defaultTemplate.primaryCanvas,
    ...defaultTemplate.contextSidebar,
    ...defaultTemplate.floatingUtilities
  ];
  const optionModules = moduleOptionIds
    .map((optionId, index) => {
      const optionDefinition = registry.byId.get(optionId);
      return optionDefinition ? optionToCanvasModule(optionDefinition, index) : null;
    })
    .filter((module): module is WorkspaceCanvasModule => Boolean(module));
  const modules = optionModules.length > 0
    ? optionModules.sort((a, b) => a.priority - b.priority)
    : [
        ...input.workspace.widgets.map((widget, index) => widgetToCanvasModule(widget, index)),
        ...input.workspace.panels.map((panel, index) => panelToCanvasModule(panel, input.workspace.widgets.length + index))
      ].sort((a, b) => a.priority - b.priority);

  return {
    template,
    density,
    snapGrid: {
      columns: template.columns,
      rowHeight: densitySettings.rowHeight,
      gutter: densitySettings.gutter
    },
    modules,
    primaryModules: modules.filter((module) => module.region === "primary_canvas"),
    contextualModules: modules.filter((module) => module.region === "context_sidebar"),
    utilityModules: modules.filter((module) => module.region === "floating_utility" || module.region === "bottom_console")
  };
}

export function inferWorkspaceModuleRepresentation(kind: WorkspaceWidgetKind): WorkspaceModuleRepresentation {
  const representationByKind: Record<WorkspaceWidgetKind, WorkspaceModuleRepresentation> = {
    approval: "operational_panel",
    board: "kanban",
    document_preview: "document_preview",
    form: "form_flow",
    inspector: "inspector",
    map: "map",
    media: "media_board",
    message: "message_thread",
    metric: "compact_strip",
    summary: "operational_panel",
    table: "spreadsheet",
    timeline: "timeline"
  };

  return representationByKind[kind];
}

function canvasTemplate(
  key: string,
  label: string,
  mode: WorkspaceOptionMode,
  density: WorkspaceDensityMode,
  description: string
): WorkspaceCanvasTemplate {
  const densityDefinition = getWorkspaceDensityDefinition(density);
  return {
    key,
    label,
    mode,
    density,
    description,
    columns: densityDefinition.columns,
    regions: ["global_nav", "workflow_nav", "primary_canvas", "context_sidebar", "floating_utility", "bottom_console"]
  };
}

function optionToCanvasModule(optionDefinition: WorkspaceOptionDefinition, index: number): WorkspaceCanvasModule {
  const representation = optionRepresentationToCanvasRepresentation(optionDefinition.representationTypes[0]);
  return {
    key: `option.${optionDefinition.id}`,
    label: optionDefinition.label,
    source: "option",
    sourceKey: optionDefinition.id,
    region: optionRegionToCanvasRegion(optionDefinition.preferredPlacement, optionDefinition.region),
    representation,
    minColumnSpan: optionSizeToColumnSpan(optionDefinition.minSize),
    defaultColumnSpan: optionSizeToColumnSpan(optionDefinition.defaultSize),
    minRowSpan: optionDefinition.minSize === "xs" || optionDefinition.minSize === "sm" ? 1 : 2,
    defaultRowSpan: optionRepresentationToRowSpan(representation),
    collapsible: true,
    resizable: optionDefinition.region !== "workflow_navigation",
    dockable: optionDefinition.region !== "workflow_navigation",
    lazy: optionDefinition.region === "primary_canvas" || optionDefinition.region === "context_sidebar",
    priority: optionDefinition.priority + index / 100
  };
}

function optionRepresentationToCanvasRepresentation(representation: WorkspaceRepresentationType): WorkspaceModuleRepresentation {
  const representationMap: Record<WorkspaceRepresentationType, WorkspaceModuleRepresentation> = {
    alert: "operational_panel",
    button: "compact_strip",
    card: "operational_panel",
    chart: "operational_panel",
    checklist: "form_flow",
    command: "form_flow",
    dockedPanel: "message_thread",
    document: "document_preview",
    drawer: "inspector",
    floatingPanel: "form_flow",
    form: "form_flow",
    inbox: "message_thread",
    kanban: "kanban",
    map: "map",
    media: "media_board",
    modal: "form_flow",
    spreadsheet: "spreadsheet",
    table: "spreadsheet",
    timeline: "timeline",
    workflow: "operational_panel"
  };

  return representationMap[representation];
}

function optionRegionToCanvasRegion(placement: string, region: string): WorkspaceCanvasRegion {
  if (placement === "leftRail" || region === "workflow_navigation") return "workflow_nav";
  if (placement === "rightSidebar" || region === "context_sidebar") return "context_sidebar";
  if (placement === "bottomConsole") return "bottom_console";
  if (placement === "floating" || placement === "drawer" || placement === "modal") return "floating_utility";
  return "primary_canvas";
}

function optionSizeToColumnSpan(size: WorkspaceOptionDefinition["defaultSize"]): number {
  const spans: Record<WorkspaceOptionDefinition["defaultSize"], number> = {
    xs: 2,
    sm: 3,
    md: 4,
    lg: 6,
    xl: 8,
    full: 12
  };

  return spans[size];
}

function optionRepresentationToRowSpan(representation: WorkspaceModuleRepresentation): number {
  if (representation === "compact_strip") return 1;
  if (representation === "spreadsheet" || representation === "kanban" || representation === "timeline") return 5;
  if (representation === "map" || representation === "media_board" || representation === "document_preview") return 4;
  return 3;
}

function widgetToCanvasModule(widget: WorkspaceWidgetDefinition, index: number): WorkspaceCanvasModule {
  const representation = inferWorkspaceModuleRepresentation(widget.kind);
  return {
    key: `widget.${widget.key}`,
    label: widget.label,
    source: "widget",
    sourceKey: widget.key,
    region: getRegionForRepresentation(representation),
    representation,
    minColumnSpan: representation === "compact_strip" ? 2 : 3,
    defaultColumnSpan: getDefaultColumnSpan(representation, widget.defaultSize),
    minRowSpan: representation === "compact_strip" ? 1 : 2,
    defaultRowSpan: getDefaultRowSpan(representation),
    collapsible: true,
    resizable: representation !== "compact_strip",
    dockable: representation !== "compact_strip",
    lazy: representation !== "compact_strip",
    priority: index
  };
}

function panelToCanvasModule(panel: WorkspacePanelDefinition, index: number): WorkspaceCanvasModule {
  const representation: WorkspaceModuleRepresentation = panel.kind === "bottom_sheet"
    ? "form_flow"
    : panel.kind === "dock"
      ? "message_thread"
      : panel.kind === "inspector"
        ? "inspector"
        : "operational_panel";

  return {
    key: `panel.${panel.key}`,
    label: panel.label,
    source: "panel",
    sourceKey: panel.key,
    region: panel.kind === "dock" || panel.kind === "bottom_sheet" ? "bottom_console" : "context_sidebar",
    representation,
    minColumnSpan: 3,
    defaultColumnSpan: panel.defaultSize === "xl" || panel.defaultSize === "full" ? 5 : 4,
    minRowSpan: 2,
    defaultRowSpan: panel.kind === "split_pane" ? 5 : 3,
    collapsible: true,
    resizable: true,
    dockable: true,
    lazy: true,
    priority: index
  };
}

function getRegionForRepresentation(representation: WorkspaceModuleRepresentation): WorkspaceCanvasRegion {
  if (representation === "compact_strip") return "workflow_nav";
  if (representation === "inspector" || representation === "document_preview" || representation === "message_thread") return "context_sidebar";
  if (representation === "form_flow") return "floating_utility";
  return "primary_canvas";
}

function getDefaultColumnSpan(representation: WorkspaceModuleRepresentation, size: WorkspaceWidgetDefinition["defaultSize"]): number {
  if (representation === "compact_strip") return 2;
  if (representation === "spreadsheet" || representation === "kanban" || representation === "timeline") return 6;
  if (representation === "map" || representation === "media_board") return 5;
  if (size === "full") return 12;
  if (size === "xl") return 8;
  if (size === "lg") return 5;
  return 4;
}

function getDefaultRowSpan(representation: WorkspaceModuleRepresentation): number {
  if (representation === "compact_strip") return 1;
  if (representation === "spreadsheet" || representation === "kanban" || representation === "timeline") return 5;
  if (representation === "map" || representation === "media_board") return 4;
  if (representation === "inspector" || representation === "document_preview") return 4;
  return 3;
}

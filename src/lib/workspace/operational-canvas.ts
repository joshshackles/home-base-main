import type {
  WorkspaceMode,
  WorkspacePanelDefinition,
  WorkspaceResolvedModel,
  WorkspaceWidgetDefinition,
  WorkspaceWidgetKind
} from "@/lib/workspace/types";

export type WorkspaceDensityMode = "comfortable" | "operational" | "analyst" | "command_center";

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
  source: "widget" | "panel";
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
  mode: WorkspaceMode;
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

export const workspaceDensitySettings: Record<WorkspaceDensityMode, { label: string; rowHeight: number; gutter: number; description: string }> = {
  comfortable: {
    label: "Comfortable",
    rowHeight: 92,
    gutter: 16,
    description: "Simplified spacing for occasional users and guided workflows."
  },
  operational: {
    label: "Operational",
    rowHeight: 76,
    gutter: 12,
    description: "Balanced professional density for daily property operations."
  },
  analyst: {
    label: "Analyst",
    rowHeight: 60,
    gutter: 8,
    description: "Dense tables, timelines, and comparison views for power users."
  },
  command_center: {
    label: "Command Center",
    rowHeight: 52,
    gutter: 6,
    description: "High-density mission-control layout for large portfolios and urgent queues."
  }
};

export const workspaceCanvasTemplates: Record<WorkspaceMode, WorkspaceCanvasTemplate> = {
  overview: canvasTemplate("overview", "Overview canvas", "overview", "operational", "Balanced operating view with status, activity, and next actions."),
  leasing: canvasTemplate("leasing", "Leasing canvas", "leasing", "operational", "Pipeline-oriented layout for listings, leads, applications, tours, messages, and approvals."),
  resident: canvasTemplate("resident", "Resident canvas", "resident", "comfortable", "Tenancy lifecycle layout for household, lease, payments, documents, maintenance, and communication."),
  financial: canvasTemplate("financial", "Financial canvas", "financial", "analyst", "Audit-safe financial layout for ledger, payments, subsidy, exports, and exception handling."),
  maintenance: canvasTemplate("maintenance", "Maintenance dispatch canvas", "maintenance", "operational", "Dispatch layout for repair triage, vendor assignment, media, messages, estimates, and completion."),
  inspection: canvasTemplate("inspection", "Inspection canvas", "inspection", "operational", "Checklist and correction workflow layout for inspections, evidence, reports, and reinspection."),
  documents: canvasTemplate("documents", "Document operations canvas", "documents", "analyst", "Document center layout for previews, sharing, signatures, filters, and timeline evidence."),
  communication: canvasTemplate("communication", "Communication canvas", "communication", "operational", "Message triage layout with entity context, assignment, activity, and quick actions."),
  executive: canvasTemplate("executive", "Executive canvas", "executive", "comfortable", "High-level performance layout for portfolio owners, leadership, and controlled drilldowns."),
  compliance: canvasTemplate("compliance", "Compliance canvas", "compliance", "analyst", "Program and audit layout for RFTA, vouchers, certifications, documents, subsidy, and inspections."),
  mobile_field: canvasTemplate("mobile_field", "Mobile field canvas", "mobile_field", "comfortable", "Action-first field layout for vendors, inspectors, camera capture, notes, and completion.")
};

export function buildOperationalCanvasModel(input: {
  workspace: WorkspaceResolvedModel;
  density?: WorkspaceDensityMode;
}): WorkspaceOperationalCanvasModel {
  const density = input.density ?? workspaceCanvasTemplates[input.workspace.context.resolvedMode].density;
  const densitySettings = workspaceDensitySettings[density];
  const template = {
    ...workspaceCanvasTemplates[input.workspace.context.resolvedMode],
    density
  };
  const widgetModules = input.workspace.widgets.map((widget, index) => widgetToCanvasModule(widget, index));
  const panelModules = input.workspace.panels.map((panel, index) => panelToCanvasModule(panel, widgetModules.length + index));
  const modules = [...widgetModules, ...panelModules].sort((a, b) => a.priority - b.priority);

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
  mode: WorkspaceMode,
  density: WorkspaceDensityMode,
  description: string
): WorkspaceCanvasTemplate {
  return {
    key,
    label,
    mode,
    density,
    description,
    columns: mode === "mobile_field" ? 4 : mode === "executive" || density === "comfortable" ? 8 : 12,
    regions: ["global_nav", "workflow_nav", "primary_canvas", "context_sidebar", "floating_utility", "bottom_console"]
  };
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


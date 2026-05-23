import type { WorkspaceDensityMode, WorkspaceOptionMode } from "@/lib/workspace/workspace-modes";

export type WorkspaceOptionRegion = "workflow_navigation" | "primary_canvas" | "context_sidebar" | "floating_utility";

export type WorkspaceOptionCategory =
  | "property"
  | "leasing"
  | "resident"
  | "lease"
  | "financial"
  | "maintenance"
  | "inspection"
  | "document"
  | "communication"
  | "compliance"
  | "analytics"
  | "automation"
  | "admin"
  | "media"
  | "workflow"
  | "map"
  | "staff";

export type WorkspaceOptionEntityType =
  | "property"
  | "unit"
  | "resident"
  | "applicant"
  | "landlord"
  | "lease"
  | "payment"
  | "maintenanceRequest"
  | "inspection"
  | "document"
  | "message"
  | "task"
  | "vendor"
  | "organization"
  | "staff"
  | "report"
  | "auditEvent"
  | "workflow"
  | "automation";

export type WorkspaceRepresentationType =
  | "button"
  | "card"
  | "table"
  | "spreadsheet"
  | "kanban"
  | "timeline"
  | "map"
  | "chart"
  | "checklist"
  | "form"
  | "inbox"
  | "document"
  | "media"
  | "command"
  | "alert"
  | "workflow"
  | "drawer"
  | "modal"
  | "dockedPanel"
  | "floatingPanel";

export type WorkspaceOptionSize = "xs" | "sm" | "md" | "lg" | "xl" | "full";

export type WorkspaceOptionPlacement =
  | "leftRail"
  | "topStrip"
  | "primary"
  | "secondary"
  | "rightSidebar"
  | "bottomConsole"
  | "floating"
  | "drawer"
  | "modal";

export type WorkspaceOptionDefinition = {
  id: string;
  label: string;
  description: string;
  region: WorkspaceOptionRegion;
  category: WorkspaceOptionCategory;
  supportedModes: WorkspaceOptionMode[];
  supportedDensityModes: WorkspaceDensityMode[];
  allowedEntityTypes: WorkspaceOptionEntityType[];
  requiredPermissions: string[];
  defaultSize: WorkspaceOptionSize;
  minSize: WorkspaceOptionSize;
  preferredPlacement: WorkspaceOptionPlacement;
  representationTypes: WorkspaceRepresentationType[];
  priority: number;
  isExperimental: boolean;
  isDefault: boolean;
};

export type WorkspaceTemplateDefinition = {
  id: string;
  label: string;
  entityType: WorkspaceOptionEntityType;
  mode: WorkspaceOptionMode;
  density: WorkspaceDensityMode;
  workflowNavigation: string[];
  primaryCanvas: string[];
  contextSidebar: string[];
  floatingUtilities: string[];
};

export type WorkspaceOptionRegistry = {
  options: WorkspaceOptionDefinition[];
  templates: WorkspaceTemplateDefinition[];
  byId: Map<string, WorkspaceOptionDefinition>;
};


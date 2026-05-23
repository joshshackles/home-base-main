import type {
  WorkspaceAction,
  WorkspaceCommand,
  WorkspaceCommandCategory,
  WorkspaceContext,
  WorkspaceEntityRef,
  WorkspaceMode
} from "@/lib/workspace/types";

export type WorkspaceBoundCommandAction = WorkspaceAction & {
  source: "workspace-command";
  commandKey: string;
  category: WorkspaceCommandCategory;
  auditRequired: boolean;
  entity: WorkspaceEntityRef;
  mode: WorkspaceMode;
};

export type WorkspaceCommandRouteResolver = (input: {
  command: WorkspaceCommand;
  entity: WorkspaceEntityRef;
  mode: WorkspaceMode;
  context?: WorkspaceContext;
}) => string | undefined;

export function bindWorkspaceCommandsToActions(input: {
  commands: WorkspaceCommand[];
  entity: WorkspaceEntityRef;
  mode: WorkspaceMode;
  canAccess: boolean;
  context?: WorkspaceContext;
  routeForCommand: WorkspaceCommandRouteResolver;
  limit?: number;
}): WorkspaceBoundCommandAction[] {
  const actions = input.commands.map((command): WorkspaceBoundCommandAction => {
    const href = input.routeForCommand({
      command,
      entity: input.entity,
      mode: input.mode,
      context: input.context
    });
    const disabled = !input.canAccess || !href;

    return {
      key: command.key,
      label: command.label,
      description: command.description,
      href,
      commandKey: command.key,
      tone: command.auditRequired ? "secondary" : command.category === "navigation" ? "quiet" : "secondary",
      disabled,
      disabledReason: !input.canAccess
        ? "This action is unavailable because the workspace is outside your permission scope."
        : href
          ? undefined
          : "This command is registered but does not have a route binding for this workspace yet.",
      source: "workspace-command",
      category: command.category,
      auditRequired: command.auditRequired ?? false,
      entity: input.entity,
      mode: input.mode
    };
  });

  return typeof input.limit === "number" ? actions.slice(0, input.limit) : actions;
}


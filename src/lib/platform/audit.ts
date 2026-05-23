import type { AuditAction, Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import type { PlatformContext, PlatformEntityRef } from "@/lib/platform/types";

type PlatformAuditInput = {
  action: AuditAction;
  entity: PlatformEntityRef;
  message: string;
  metadata?: Prisma.InputJsonValue | null;
};

export async function writePlatformAudit(ctx: PlatformContext, input: PlatformAuditInput) {
  await writeAuditLog({
    actor: ctx.actor,
    action: input.action,
    entityType: input.entity.type,
    entityId: input.entity.id ?? null,
    message: input.message,
    metadata: input.metadata ?? undefined
  });
}

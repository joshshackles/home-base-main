import { AuditAction } from "@prisma/client";
import { writePlatformAudit } from "@/lib/platform/audit";
import { forbidden } from "@/lib/platform/errors";
import type { PlatformContext, PlatformEntityRef } from "@/lib/platform/types";

export async function requirePlatformAccess(ctx: PlatformContext, allowed: boolean, entity: PlatformEntityRef, reason: string) {
  if (allowed) return;

  await writePlatformAudit(ctx, {
    action: AuditAction.NOTE,
    entity,
    message: `Authorization denied: ${reason}`,
    metadata: {
      source: ctx.metadata?.source ?? "web",
      requestId: ctx.metadata?.requestId ?? null
    }
  });

  forbidden(reason, { entity });
}

export function assertPlatformInvariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Platform invariant failed: ${message}`);
  }
}

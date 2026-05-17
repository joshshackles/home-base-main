import type { AuditAction, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditActor = {
  userId?: string | null;
  email?: string | null;
  role?: UserRole | null;
};

type AuditInput = {
  actor?: AuditActor | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actor?.userId ?? null,
        actorEmail: input.actor?.email ?? null,
        actorRole: input.actor?.role ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        message: input.message,
        metadata: input.metadata ?? undefined
      }
    });
  } catch (error) {
    console.error("Audit log write failed", error);
  }
}

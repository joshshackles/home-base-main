import type { Prisma, SecurityEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SecurityEventInput = {
  type: SecurityEventType;
  userId?: string | null;
  email?: string | null;
  message: string;
  metadata?: Prisma.InputJsonValue | null;
};

export async function writeSecurityEvent(input: SecurityEventInput) {
  try {
    await prisma.securityEvent.create({
      data: {
        type: input.type,
        userId: input.userId ?? null,
        email: input.email?.toLowerCase() ?? null,
        message: input.message,
        metadata: input.metadata ?? undefined
      }
    });
  } catch (error) {
    console.error("Security event write failed", error);
  }
}

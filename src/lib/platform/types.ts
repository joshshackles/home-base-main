import type { Prisma, UserRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import type { AuthorizedUser } from "@/lib/authorization";

export type PlatformActor = AuthorizedUser & {
  role: UserRole;
};

export type PlatformRequestMetadata = {
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "web" | "api" | "mobile" | "system" | "integration";
};

export type PlatformContext = {
  actor: PlatformActor;
  metadata?: PlatformRequestMetadata;
};

export type PlatformEntityRef = {
  type: string;
  id?: string | null;
};

export type PlatformAuditMetadata = Prisma.InputJsonObject;

export function actorFromSession(user: SessionPayload | AuthorizedUser): PlatformActor {
  return {
    userId: user.userId,
    email: user.email,
    name: "name" in user ? user.name : null,
    role: user.role
  };
}

export function platformContext(actor: SessionPayload | AuthorizedUser, metadata?: PlatformRequestMetadata): PlatformContext {
  return {
    actor: actorFromSession(actor),
    metadata
  };
}

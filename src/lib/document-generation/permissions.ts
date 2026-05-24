import { UserRole } from "@prisma/client";
import type { DocumentActor, DocumentPermission } from "@/lib/document-generation/types";

const rolePermissions: Record<UserRole, DocumentPermission[]> = {
  ADMIN: [
    "document.template.view",
    "document.template.create",
    "document.template.publish",
    "document.generate.preview",
    "document.generate.finalize",
    "document.download",
    "document.void",
    "report.generate",
    "report.export",
    "lease.generate",
    "lease.finalize"
  ],
  LANDLORD: [
    "document.template.view",
    "document.template.create",
    "document.generate.preview",
    "document.generate.finalize",
    "document.download",
    "document.void",
    "report.generate",
    "report.export",
    "lease.generate",
    "lease.finalize"
  ],
  TENANT: ["document.generate.preview", "document.download"],
  APPLICANT: ["document.generate.preview", "document.download"],
  INSPECTOR: ["document.generate.preview", "document.download", "report.generate"],
  VENDOR: ["document.generate.preview", "document.download"]
};

export function canUseDocumentPermission(actor: DocumentActor | null | undefined, permission: DocumentPermission) {
  if (!actor) return false;
  return rolePermissions[actor.role]?.includes(permission) ?? false;
}

export function requireDocumentPermission(actor: DocumentActor | null | undefined, permission: DocumentPermission) {
  if (!canUseDocumentPermission(actor, permission)) {
    throw new Error(`You do not have permission to ${permission.replaceAll(".", " ")}.`);
  }
}

export function documentPermissionsForRole(role: UserRole) {
  return rolePermissions[role] ?? [];
}

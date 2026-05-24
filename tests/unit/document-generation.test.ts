import { describe, expect, it } from "vitest";
import { GeneratedDocumentTemplateType, UserRole } from "@prisma/client";
import { canUseDocumentPermission } from "@/lib/document-generation/permissions";
import { documentTemplateSeeds } from "@/lib/document-generation/templates";
import { findMissingFields, summarizeMissingFields } from "@/lib/document-generation/validation";

describe("document generation foundation", () => {
  it("detects missing required fields by reusable data path", () => {
    const missing = findMissingFields(
      { tenant: { legalName: "" }, lease: { rentAmount: 1200 }, signatures: { required: ["Tenant"] } },
      [
        { key: "tenant.legalName", label: "Tenant legal name", sourceRecord: "tenant" },
        { key: "lease.rentAmount", label: "Rent amount", sourceRecord: "unit" },
        { key: "signatures.required", label: "Required signatures", sourceRecord: "lease" }
      ]
    );

    expect(missing).toHaveLength(1);
    expect(missing[0].label).toBe("Tenant legal name");
    expect(summarizeMissingFields(missing)).toContain("Tenant legal name");
  });

  it("keeps template seeds versionable and typed", () => {
    const types = new Set(documentTemplateSeeds.map((seed) => seed.templateType));
    expect(types.has(GeneratedDocumentTemplateType.LEASE)).toBe(true);
    expect(types.has(GeneratedDocumentTemplateType.RENT_ROLL)).toBe(true);
    expect(types.has(GeneratedDocumentTemplateType.MAINTENANCE_REPORT)).toBe(true);
    for (const seed of documentTemplateSeeds) {
      expect(seed.outputFormats.length).toBeGreaterThan(0);
      expect(seed.requiredFields.length).toBeGreaterThan(0);
      expect(seed.templateContent.length).toBeGreaterThan(10);
    }
  });

  it("enforces role-safe document permissions", () => {
    expect(canUseDocumentPermission({ userId: "admin", role: UserRole.ADMIN }, "document.template.publish")).toBe(true);
    expect(canUseDocumentPermission({ userId: "landlord", role: UserRole.LANDLORD }, "lease.finalize")).toBe(true);
    expect(canUseDocumentPermission({ userId: "tenant", role: UserRole.TENANT }, "document.template.publish")).toBe(false);
    expect(canUseDocumentPermission({ userId: "vendor", role: UserRole.VENDOR }, "document.void")).toBe(false);
  });
});

import { DocumentTemplateEngine, GeneratedDocumentOutputFormat, GeneratedDocumentTemplateType } from "@prisma/client";
import type { DocumentTemplateSeed } from "@/lib/document-generation/types";

const leaseRequired = [
  { key: "tenant.legalName", label: "Tenant legal name", sourceRecord: "tenant", editHref: "/landlord/residents" },
  { key: "unit.address", label: "Unit address", sourceRecord: "unit", editHref: "/landlord/inventory" },
  { key: "lease.startDate", label: "Lease start date", sourceRecord: "lease", editHref: "/landlord/leases" },
  { key: "lease.endDate", label: "Lease end date", sourceRecord: "lease", editHref: "/landlord/leases" },
  { key: "lease.rentAmount", label: "Rent amount", sourceRecord: "unit", editHref: "/landlord/inventory" },
  { key: "lease.depositAmount", label: "Deposit amount", sourceRecord: "unit", editHref: "/landlord/inventory" },
  { key: "landlord.legalEntity", label: "Landlord legal entity", sourceRecord: "landlord", editHref: "/landlord/settings" },
  { key: "lease.utilities", label: "Utility responsibility", sourceRecord: "unit", editHref: "/landlord/inventory" },
  { key: "lease.lateFeePolicy", label: "Late fee policy", sourceRecord: "unit", editHref: "/landlord/inventory" },
  { key: "signatures.required", label: "Required signatures", sourceRecord: "lease", editHref: "/landlord/leases" }
];

const reportRequired = [
  { key: "report.dateRange", label: "Date range", sourceRecord: "report", editHref: "/landlord/reports" },
  { key: "report.selection", label: "Property or unit selection", sourceRecord: "report", editHref: "/landlord/reports" },
  { key: "table.rows", label: "Report rows", sourceRecord: "report", editHref: "/landlord/reports" }
];

export const documentTemplateSeeds: DocumentTemplateSeed[] = [
  {
    name: "Generated Lease Draft",
    description: "Template-driven lease draft with legal-review placeholders for state-specific language.",
    templateType: GeneratedDocumentTemplateType.LEASE,
    category: "LEASE",
    engine: DocumentTemplateEngine.JSON_PDF_TEMPLATE,
    outputFormats: [GeneratedDocumentOutputFormat.PDF, GeneratedDocumentOutputFormat.DOCX, GeneratedDocumentOutputFormat.HTML_PREVIEW],
    defaultOutputFormat: GeneratedDocumentOutputFormat.PDF,
    requiredFields: leaseRequired,
    optionalFields: [
      { key: "lease.pets", label: "Pet terms", sourceRecord: "unit" },
      { key: "lease.occupants", label: "Authorized occupants", sourceRecord: "application" }
    ],
    templateContent: [
      "Generated lease draft.",
      "Sections: parties, property/unit, lease term, rent, deposit, utilities, late fees, maintenance responsibilities, occupants, pets, notices, signatures.",
      "Legal review required before using this as a final jurisdiction-specific lease."
    ].join("\n")
  },
  {
    name: "Rent Roll Report",
    description: "Portfolio rent roll with unit, resident, rent, status, and balance columns.",
    templateType: GeneratedDocumentTemplateType.RENT_ROLL,
    category: "LANDLORD_DOCUMENT",
    engine: DocumentTemplateEngine.SYSTEM_REACT_PDF,
    outputFormats: [GeneratedDocumentOutputFormat.PDF, GeneratedDocumentOutputFormat.CSV, GeneratedDocumentOutputFormat.XLSX, GeneratedDocumentOutputFormat.HTML_PREVIEW],
    defaultOutputFormat: GeneratedDocumentOutputFormat.PDF,
    requiredFields: reportRequired,
    optionalFields: [],
    templateContent: "Rent roll report with summary cards and detailed table."
  },
  {
    name: "Property Summary Report",
    description: "Property-level performance, occupancy, open work, and leasing summary.",
    templateType: GeneratedDocumentTemplateType.PROPERTY_SUMMARY,
    category: "LANDLORD_DOCUMENT",
    engine: DocumentTemplateEngine.SYSTEM_REACT_PDF,
    outputFormats: [GeneratedDocumentOutputFormat.PDF, GeneratedDocumentOutputFormat.HTML_PREVIEW],
    defaultOutputFormat: GeneratedDocumentOutputFormat.PDF,
    requiredFields: reportRequired,
    optionalFields: [],
    templateContent: "Property summary report with portfolio context."
  },
  {
    name: "Tenant Rent Ledger",
    description: "Tenant-facing or internal ledger statement with charges, payments, credits, and balance.",
    templateType: GeneratedDocumentTemplateType.RENT_LEDGER,
    category: "TENANT_DOCUMENT",
    engine: DocumentTemplateEngine.SYSTEM_REACT_PDF,
    outputFormats: [GeneratedDocumentOutputFormat.PDF, GeneratedDocumentOutputFormat.CSV, GeneratedDocumentOutputFormat.HTML_PREVIEW],
    defaultOutputFormat: GeneratedDocumentOutputFormat.PDF,
    requiredFields: reportRequired,
    optionalFields: [{ key: "tenant.legalName", label: "Tenant name", sourceRecord: "tenant" }],
    templateContent: "Tenant rent ledger statement."
  },
  {
    name: "Maintenance Summary Report",
    description: "Maintenance workload, open issues, priority, status, assignments, and repair history.",
    templateType: GeneratedDocumentTemplateType.MAINTENANCE_REPORT,
    category: "LANDLORD_DOCUMENT",
    engine: DocumentTemplateEngine.SYSTEM_REACT_PDF,
    outputFormats: [GeneratedDocumentOutputFormat.PDF, GeneratedDocumentOutputFormat.CSV, GeneratedDocumentOutputFormat.HTML_PREVIEW],
    defaultOutputFormat: GeneratedDocumentOutputFormat.PDF,
    requiredFields: reportRequired,
    optionalFields: [],
    templateContent: "Maintenance summary report."
  },
  {
    name: "Inspection Report",
    description: "Inspection result, checklist, evidence, notes, and follow-up summary.",
    templateType: GeneratedDocumentTemplateType.INSPECTION_REPORT,
    category: "INSPECTION",
    engine: DocumentTemplateEngine.SYSTEM_REACT_PDF,
    outputFormats: [GeneratedDocumentOutputFormat.PDF, GeneratedDocumentOutputFormat.HTML_PREVIEW],
    defaultOutputFormat: GeneratedDocumentOutputFormat.PDF,
    requiredFields: [
      { key: "inspection.id", label: "Inspection record", sourceRecord: "inspection", editHref: "/landlord/inspections" },
      { key: "unit.address", label: "Unit address", sourceRecord: "unit", editHref: "/landlord/inventory" }
    ],
    optionalFields: [],
    templateContent: "Inspection report with checklist and evidence placeholders."
  },
  {
    name: "Application Activity Report",
    description: "Application activity, status, applicant, unit, and decision workflow report.",
    templateType: GeneratedDocumentTemplateType.APPLICATION_PACKET,
    category: "APPLICATION_PACKET",
    engine: DocumentTemplateEngine.SYSTEM_REACT_PDF,
    outputFormats: [GeneratedDocumentOutputFormat.PDF, GeneratedDocumentOutputFormat.HTML_PREVIEW],
    defaultOutputFormat: GeneratedDocumentOutputFormat.PDF,
    requiredFields: reportRequired,
    optionalFields: [],
    templateContent: "Application packet and activity report."
  }
];

export function getSeedForTemplateType(templateType: GeneratedDocumentTemplateType) {
  return documentTemplateSeeds.find((seed) => seed.templateType === templateType) ?? documentTemplateSeeds[0];
}

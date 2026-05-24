import type {
  DocumentGenerationJobStatus,
  DocumentTemplateEngine,
  GeneratedDocumentOutputFormat,
  GeneratedDocumentStatus,
  GeneratedDocumentTemplateType,
  RelatedDocumentRecordType,
  UserRole
} from "@prisma/client";

export type DocumentPermission =
  | "document.template.view"
  | "document.template.create"
  | "document.template.publish"
  | "document.generate.preview"
  | "document.generate.finalize"
  | "document.download"
  | "document.void"
  | "report.generate"
  | "report.export"
  | "lease.generate"
  | "lease.finalize";

export type DocumentActor = {
  userId: string;
  email?: string | null;
  name?: string | null;
  role: UserRole;
};

export type DocumentFieldRequirement = {
  key: string;
  label: string;
  sourceRecord: string;
  editHref?: string;
};

export type DocumentDataBuildResult<TData = Record<string, unknown>> = {
  data: TData;
  requiredFields: DocumentFieldRequirement[];
  missingFields: DocumentFieldRequirement[];
  warnings: string[];
  relatedRecords: {
    propertyId?: string | null;
    unitId?: string | null;
    applicantId?: string | null;
    tenantId?: string | null;
    leaseId?: string | null;
    maintenanceId?: string | null;
    inspectionId?: string | null;
  };
  suggestedDocumentTitle: string;
};

export type DocumentGenerationRequest = {
  templateType: GeneratedDocumentTemplateType;
  outputFormat?: GeneratedDocumentOutputFormat;
  relatedRecordType: RelatedDocumentRecordType;
  relatedRecordId?: string;
  dateRange?: { from?: Date; to?: Date };
  filters?: Record<string, string | number | boolean | null | undefined>;
  finalize?: boolean;
  templateId?: string;
  templateVersionId?: string;
  useLatestPublishedVersion?: boolean;
};

export type DocumentTemplateSeed = {
  name: string;
  description: string;
  templateType: GeneratedDocumentTemplateType;
  category: string;
  engine: DocumentTemplateEngine;
  outputFormats: GeneratedDocumentOutputFormat[];
  defaultOutputFormat: GeneratedDocumentOutputFormat;
  requiredFields: DocumentFieldRequirement[];
  optionalFields: DocumentFieldRequirement[];
  templateContent: string;
};

export type DocumentGenerationPreview = {
  title: string;
  templateType: GeneratedDocumentTemplateType;
  outputFormat: GeneratedDocumentOutputFormat;
  status: DocumentGenerationJobStatus;
  canFinalize: boolean;
  data: Record<string, unknown>;
  requiredFields: DocumentFieldRequirement[];
  missingFields: DocumentFieldRequirement[];
  warnings: string[];
  relatedRecords: DocumentDataBuildResult["relatedRecords"];
  htmlPreview: string;
};

export type GeneratedDocumentSummary = {
  id: string;
  title: string;
  status: GeneratedDocumentStatus;
  documentType: GeneratedDocumentTemplateType;
  outputFormat: GeneratedDocumentOutputFormat;
  generatedAt: Date | null;
  finalizedAt: Date | null;
  missingFields: DocumentFieldRequirement[];
};

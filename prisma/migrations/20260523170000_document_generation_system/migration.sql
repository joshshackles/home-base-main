-- CreateEnum
CREATE TYPE "GeneratedDocumentTemplateType" AS ENUM ('LEASE', 'LEASE_RENEWAL', 'NOTICE', 'TENANT_STATEMENT', 'RENT_LEDGER', 'OWNER_STATEMENT', 'RENT_ROLL', 'PROPERTY_SUMMARY', 'UNIT_SUMMARY', 'MAINTENANCE_REPORT', 'INSPECTION_REPORT', 'APPLICATION_PACKET', 'DOCUMENT_COMPLIANCE_REPORT');

-- CreateEnum
CREATE TYPE "GeneratedDocumentTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GeneratedDocumentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentTemplateEngine" AS ENUM ('SYSTEM_REACT_PDF', 'JSON_PDF_TEMPLATE', 'DOCX_TEMPLATE', 'HTML_TEMPLATE');

-- CreateEnum
CREATE TYPE "GeneratedDocumentOutputFormat" AS ENUM ('PDF', 'DOCX', 'CSV', 'XLSX', 'HTML_PREVIEW');

-- CreateEnum
CREATE TYPE "GeneratedDocumentStatus" AS ENUM ('DRAFT', 'PREVIEWED', 'GENERATED', 'FINALIZED', 'SENT', 'SIGNED', 'VOIDED', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentGenerationJobStatus" AS ENUM ('QUEUED', 'VALIDATING', 'READY_FOR_PREVIEW', 'BLOCKED_MISSING_FIELDS', 'GENERATING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RelatedDocumentRecordType" AS ENUM ('PROPERTY', 'UNIT', 'APPLICANT', 'TENANT', 'LEASE', 'MAINTENANCE', 'INSPECTION', 'PORTFOLIO');

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateType" "GeneratedDocumentTemplateType" NOT NULL,
    "documentCategory" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "jurisdictionState" TEXT,
    "status" "GeneratedDocumentTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "outputFormats" "GeneratedDocumentOutputFormat"[],
    "defaultOutputFormat" "GeneratedDocumentOutputFormat" NOT NULL DEFAULT 'PDF',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "GeneratedDocumentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "templateEngine" "DocumentTemplateEngine" NOT NULL DEFAULT 'JSON_PDF_TEMPLATE',
    "templateSchema" JSONB NOT NULL,
    "templateContent" TEXT NOT NULL,
    "requiredFields" JSONB NOT NULL,
    "optionalFields" JSONB,
    "sampleData" JSONB,
    "previewImageUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "templateId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "documentType" "GeneratedDocumentTemplateType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "GeneratedDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "outputFormat" "GeneratedDocumentOutputFormat" NOT NULL DEFAULT 'PDF',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "storagePath" TEXT,
    "sourceDataSnapshot" JSONB NOT NULL,
    "missingFieldsSnapshot" JSONB NOT NULL,
    "relatedPropertyId" TEXT,
    "relatedUnitId" TEXT,
    "relatedApplicantId" TEXT,
    "relatedTenantId" TEXT,
    "relatedLeaseId" TEXT,
    "relatedMaintenanceId" TEXT,
    "relatedInspectionId" TEXT,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentGenerationJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "templateId" TEXT NOT NULL,
    "templateVersionId" TEXT,
    "status" "DocumentGenerationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "requestedOutputFormat" "GeneratedDocumentOutputFormat" NOT NULL DEFAULT 'PDF',
    "relatedRecordType" "RelatedDocumentRecordType" NOT NULL,
    "relatedRecordId" TEXT,
    "inputDataSnapshot" JSONB NOT NULL,
    "validationResult" JSONB NOT NULL,
    "errorMessage" TEXT,
    "generatedDocumentId" TEXT,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentTemplate_organizationId_idx" ON "DocumentTemplate"("organizationId");
CREATE INDEX "DocumentTemplate_templateType_idx" ON "DocumentTemplate"("templateType");
CREATE INDEX "DocumentTemplate_documentCategory_idx" ON "DocumentTemplate"("documentCategory");
CREATE INDEX "DocumentTemplate_status_idx" ON "DocumentTemplate"("status");
CREATE INDEX "DocumentTemplate_jurisdictionState_idx" ON "DocumentTemplate"("jurisdictionState");
CREATE INDEX "DocumentTemplate_createdById_idx" ON "DocumentTemplate"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplateVersion_templateId_versionNumber_key" ON "DocumentTemplateVersion"("templateId", "versionNumber");
CREATE INDEX "DocumentTemplateVersion_templateId_status_idx" ON "DocumentTemplateVersion"("templateId", "status");
CREATE INDEX "DocumentTemplateVersion_templateEngine_idx" ON "DocumentTemplateVersion"("templateEngine");
CREATE INDEX "DocumentTemplateVersion_createdById_idx" ON "DocumentTemplateVersion"("createdById");
CREATE INDEX "DocumentTemplateVersion_createdAt_idx" ON "DocumentTemplateVersion"("createdAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_organizationId_idx" ON "GeneratedDocument"("organizationId");
CREATE INDEX "GeneratedDocument_templateId_idx" ON "GeneratedDocument"("templateId");
CREATE INDEX "GeneratedDocument_templateVersionId_idx" ON "GeneratedDocument"("templateVersionId");
CREATE INDEX "GeneratedDocument_documentType_idx" ON "GeneratedDocument"("documentType");
CREATE INDEX "GeneratedDocument_status_idx" ON "GeneratedDocument"("status");
CREATE INDEX "GeneratedDocument_outputFormat_idx" ON "GeneratedDocument"("outputFormat");
CREATE INDEX "GeneratedDocument_relatedPropertyId_idx" ON "GeneratedDocument"("relatedPropertyId");
CREATE INDEX "GeneratedDocument_relatedUnitId_idx" ON "GeneratedDocument"("relatedUnitId");
CREATE INDEX "GeneratedDocument_relatedApplicantId_idx" ON "GeneratedDocument"("relatedApplicantId");
CREATE INDEX "GeneratedDocument_relatedTenantId_idx" ON "GeneratedDocument"("relatedTenantId");
CREATE INDEX "GeneratedDocument_relatedLeaseId_idx" ON "GeneratedDocument"("relatedLeaseId");
CREATE INDEX "GeneratedDocument_relatedMaintenanceId_idx" ON "GeneratedDocument"("relatedMaintenanceId");
CREATE INDEX "GeneratedDocument_relatedInspectionId_idx" ON "GeneratedDocument"("relatedInspectionId");
CREATE INDEX "GeneratedDocument_generatedById_idx" ON "GeneratedDocument"("generatedById");
CREATE INDEX "GeneratedDocument_generatedAt_idx" ON "GeneratedDocument"("generatedAt");
CREATE INDEX "GeneratedDocument_createdAt_idx" ON "GeneratedDocument"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentGenerationJob_organizationId_idx" ON "DocumentGenerationJob"("organizationId");
CREATE INDEX "DocumentGenerationJob_templateId_idx" ON "DocumentGenerationJob"("templateId");
CREATE INDEX "DocumentGenerationJob_templateVersionId_idx" ON "DocumentGenerationJob"("templateVersionId");
CREATE INDEX "DocumentGenerationJob_status_idx" ON "DocumentGenerationJob"("status");
CREATE INDEX "DocumentGenerationJob_relatedRecordType_relatedRecordId_idx" ON "DocumentGenerationJob"("relatedRecordType", "relatedRecordId");
CREATE INDEX "DocumentGenerationJob_generatedDocumentId_idx" ON "DocumentGenerationJob"("generatedDocumentId");
CREATE INDEX "DocumentGenerationJob_requestedById_idx" ON "DocumentGenerationJob"("requestedById");
CREATE INDEX "DocumentGenerationJob_createdAt_idx" ON "DocumentGenerationJob"("createdAt");
CREATE INDEX "DocumentGenerationJob_completedAt_idx" ON "DocumentGenerationJob"("completedAt");

-- AddForeignKey
ALTER TABLE "DocumentTemplateVersion" ADD CONSTRAINT "DocumentTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "DocumentTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenerationJob" ADD CONSTRAINT "DocumentGenerationJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenerationJob" ADD CONSTRAINT "DocumentGenerationJob_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "DocumentTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenerationJob" ADD CONSTRAINT "DocumentGenerationJob_generatedDocumentId_fkey" FOREIGN KEY ("generatedDocumentId") REFERENCES "GeneratedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

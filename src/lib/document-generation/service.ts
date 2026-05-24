import {
  AuditAction,
  DocumentCategory,
  DocumentGenerationJobStatus,
  DocumentTemplateEngine,
  GeneratedDocumentOutputFormat,
  GeneratedDocumentStatus,
  GeneratedDocumentTemplateStatus,
  GeneratedDocumentTemplateType,
  GeneratedDocumentVersionStatus,
  RelatedDocumentRecordType
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { buildDocumentData } from "@/lib/document-generation/builders";
import { requireDocumentPermission } from "@/lib/document-generation/permissions";
import { renderGeneratedDocumentFile, renderHtmlPreview } from "@/lib/document-generation/renderer";
import { saveGeneratedDocumentFile } from "@/lib/document-generation/storage";
import { documentTemplateSeeds, getSeedForTemplateType } from "@/lib/document-generation/templates";
import type { DocumentActor, DocumentGenerationPreview, DocumentGenerationRequest, DocumentTemplateSeed } from "@/lib/document-generation/types";

function actorScope(actor: DocumentActor) {
  return actor.role === "LANDLORD" ? actor.userId : undefined;
}

function categoryFromSeed(seed: DocumentTemplateSeed) {
  return seed.category in DocumentCategory ? seed.category as DocumentCategory : DocumentCategory.OTHER;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function ensureSystemDocumentTemplates(actor?: DocumentActor | null) {
  const templates = [];
  for (const seed of documentTemplateSeeds) {
    const template = await prisma.documentTemplate.upsert({
      where: { id: `system-${seed.templateType.toLowerCase()}` },
      create: {
        id: `system-${seed.templateType.toLowerCase()}`,
        name: seed.name,
        description: seed.description,
        templateType: seed.templateType,
        documentCategory: categoryFromSeed(seed),
        status: GeneratedDocumentTemplateStatus.PUBLISHED,
        outputFormats: seed.outputFormats,
        defaultOutputFormat: seed.defaultOutputFormat,
        createdById: actor?.userId ?? null,
        versions: {
          create: {
            versionNumber: 1,
            status: GeneratedDocumentVersionStatus.PUBLISHED,
            templateEngine: seed.engine,
            templateSchema: json({ sections: ["summary", "details", "table"], source: "system-seed" }),
            templateContent: seed.templateContent,
            requiredFields: json(seed.requiredFields),
            optionalFields: json(seed.optionalFields),
            sampleData: json({ title: seed.name }),
            createdById: actor?.userId ?? null,
            publishedAt: new Date()
          }
        }
      },
      update: {
        name: seed.name,
        description: seed.description,
        status: GeneratedDocumentTemplateStatus.PUBLISHED,
        outputFormats: seed.outputFormats,
        defaultOutputFormat: seed.defaultOutputFormat
      },
      include: { versions: true }
    });
    if (template.versions.length === 0) {
      await prisma.documentTemplateVersion.create({
        data: {
          templateId: template.id,
          versionNumber: 1,
          status: GeneratedDocumentVersionStatus.PUBLISHED,
          templateEngine: seed.engine,
          templateSchema: json({ sections: ["summary", "details", "table"], source: "system-seed" }),
          templateContent: seed.templateContent,
          requiredFields: json(seed.requiredFields),
          optionalFields: json(seed.optionalFields),
          sampleData: json({ title: seed.name }),
          createdById: actor?.userId ?? null,
          publishedAt: new Date()
        }
      });
    }
    templates.push(template);
  }
  return templates;
}

export async function listDocumentTemplates(actor: DocumentActor, templateType?: GeneratedDocumentTemplateType) {
  requireDocumentPermission(actor, "document.template.view");
  await ensureSystemDocumentTemplates(actor);
  return prisma.documentTemplate.findMany({
    where: { ...(templateType ? { templateType } : {}), status: { not: GeneratedDocumentTemplateStatus.ARCHIVED } },
    include: { versions: { where: { status: GeneratedDocumentVersionStatus.PUBLISHED }, orderBy: { versionNumber: "desc" }, take: 1 } },
    orderBy: [{ templateType: "asc" }, { name: "asc" }]
  });
}

async function resolveTemplateVersion(request: DocumentGenerationRequest) {
  await ensureSystemDocumentTemplates();
  const template = request.templateId
    ? await prisma.documentTemplate.findUnique({ where: { id: request.templateId }, include: { versions: { orderBy: { versionNumber: "desc" } } } })
    : await prisma.documentTemplate.findFirst({ where: { templateType: request.templateType, status: GeneratedDocumentTemplateStatus.PUBLISHED }, include: { versions: { orderBy: { versionNumber: "desc" } } } });

  if (!template) throw new Error(`No document template is available for ${request.templateType}.`);
  const version = request.templateVersionId
    ? template.versions.find((item) => item.id === request.templateVersionId)
    : template.versions.find((item) => item.status === GeneratedDocumentVersionStatus.PUBLISHED) ?? template.versions[0];
  if (!version) throw new Error(`No template version is available for ${template.name}.`);
  return { template, version };
}

export async function validateDocumentData(actor: DocumentActor, request: DocumentGenerationRequest) {
  requireDocumentPermission(actor, "document.generate.preview");
  return buildDocumentData(request, actorScope(actor));
}

export async function previewDocument(actor: DocumentActor, request: DocumentGenerationRequest): Promise<DocumentGenerationPreview> {
  const { template } = await resolveTemplateVersion(request);
  const result = await validateDocumentData(actor, request);
  await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "GeneratedDocument", message: `Previewed ${template.name}.`, metadata: json({ templateType: request.templateType, missingFields: result.missingFields }) });
  return {
    title: result.suggestedDocumentTitle,
    templateType: request.templateType,
    outputFormat: request.outputFormat ?? template.defaultOutputFormat,
    status: result.missingFields.length ? DocumentGenerationJobStatus.BLOCKED_MISSING_FIELDS : DocumentGenerationJobStatus.READY_FOR_PREVIEW,
    canFinalize: result.missingFields.length === 0,
    data: result.data as Record<string, unknown>,
    requiredFields: result.requiredFields,
    missingFields: result.missingFields,
    warnings: result.warnings,
    relatedRecords: result.relatedRecords,
    htmlPreview: renderHtmlPreview(result)
  };
}

export async function createDocumentTemplate(actor: DocumentActor, input: Pick<DocumentTemplateSeed, "name" | "description" | "templateType" | "engine" | "outputFormats" | "defaultOutputFormat" | "requiredFields" | "optionalFields" | "templateContent"> & { jurisdictionState?: string | null }) {
  requireDocumentPermission(actor, "document.template.create");
  const template = await prisma.documentTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      templateType: input.templateType,
      documentCategory: DocumentCategory.OTHER,
      jurisdictionState: input.jurisdictionState ?? null,
      status: GeneratedDocumentTemplateStatus.DRAFT,
      outputFormats: input.outputFormats,
      defaultOutputFormat: input.defaultOutputFormat,
      createdById: actor.userId,
      versions: {
        create: {
          versionNumber: 1,
          status: GeneratedDocumentVersionStatus.DRAFT,
          templateEngine: input.engine,
          templateSchema: json({ sections: ["summary", "details", "table"] }),
          templateContent: input.templateContent,
          requiredFields: json(input.requiredFields),
          optionalFields: json(input.optionalFields),
          createdById: actor.userId
        }
      }
    },
    include: { versions: true }
  });
  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "DocumentTemplate", entityId: template.id, message: `Created document template ${template.name}.` });
  return template;
}

export async function publishTemplateVersion(actor: DocumentActor, versionId: string) {
  requireDocumentPermission(actor, "document.template.publish");
  const version = await prisma.documentTemplateVersion.update({
    where: { id: versionId },
    data: { status: GeneratedDocumentVersionStatus.PUBLISHED, publishedAt: new Date(), template: { update: { status: GeneratedDocumentTemplateStatus.PUBLISHED } } },
    include: { template: true }
  });
  await writeAuditLog({ actor, action: AuditAction.STATUS_CHANGE, entityType: "DocumentTemplateVersion", entityId: version.id, message: `Published ${version.template.name} v${version.versionNumber}.` });
  return version;
}

export async function generateDocument(actor: DocumentActor, request: DocumentGenerationRequest) {
  const permission = request.templateType === GeneratedDocumentTemplateType.LEASE ? "lease.generate" : "report.generate";
  requireDocumentPermission(actor, permission);
  if (request.finalize) requireDocumentPermission(actor, request.templateType === GeneratedDocumentTemplateType.LEASE ? "lease.finalize" : "document.generate.finalize");

  const { template, version } = await resolveTemplateVersion(request);
  const result = await buildDocumentData(request, actorScope(actor));
  const outputFormat = request.outputFormat ?? template.defaultOutputFormat;
  const job = await prisma.documentGenerationJob.create({
    data: {
      templateId: template.id,
      templateVersionId: version.id,
      status: result.missingFields.length && request.finalize ? DocumentGenerationJobStatus.BLOCKED_MISSING_FIELDS : DocumentGenerationJobStatus.GENERATING,
      requestedOutputFormat: outputFormat,
      relatedRecordType: request.relatedRecordType,
      relatedRecordId: request.relatedRecordId ?? null,
      inputDataSnapshot: json(request),
      validationResult: json({ missingFields: result.missingFields, warnings: result.warnings }),
      requestedById: actor.userId
    }
  });

  if (request.finalize && result.missingFields.length > 0) {
    await writeAuditLog({ actor, action: AuditAction.UPDATE, entityType: "DocumentGenerationJob", entityId: job.id, message: `Missing fields detected for ${template.name}.`, metadata: json({ missingFields: result.missingFields }) });
    throw new Error(`Cannot finalize document. ${result.missingFields.length} required field${result.missingFields.length === 1 ? "" : "s"} missing.`);
  }

  const rendered = await renderGeneratedDocumentFile(result, outputFormat);
  const file = await saveGeneratedDocumentFile(rendered.buffer, `${result.suggestedDocumentTitle}.${rendered.extension}`, rendered.mimeType);
  const now = new Date();
  const generated = await prisma.generatedDocument.create({
    data: {
      templateId: template.id,
      templateVersionId: version.id,
      documentType: template.templateType,
      title: result.suggestedDocumentTitle,
      status: request.finalize ? GeneratedDocumentStatus.FINALIZED : GeneratedDocumentStatus.GENERATED,
      outputFormat,
      fileUrl: null,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      storagePath: file.storagePath,
      sourceDataSnapshot: json(result.data),
      missingFieldsSnapshot: json(result.missingFields),
      relatedPropertyId: result.relatedRecords.propertyId ?? null,
      relatedUnitId: result.relatedRecords.unitId ?? null,
      relatedApplicantId: result.relatedRecords.applicantId ?? null,
      relatedTenantId: result.relatedRecords.tenantId ?? null,
      relatedLeaseId: result.relatedRecords.leaseId ?? null,
      relatedMaintenanceId: result.relatedRecords.maintenanceId ?? null,
      relatedInspectionId: result.relatedRecords.inspectionId ?? null,
      generatedById: actor.userId,
      generatedAt: now,
      finalizedAt: request.finalize ? now : null
    }
  });
  await prisma.generatedDocument.update({ where: { id: generated.id }, data: { fileUrl: `/api/generated-documents/${generated.id}/download` } });
  await prisma.documentGenerationJob.update({ where: { id: job.id }, data: { status: DocumentGenerationJobStatus.COMPLETED, generatedDocumentId: generated.id, completedAt: now } });
  await writeAuditLog({ actor, action: AuditAction.CREATE, entityType: "GeneratedDocument", entityId: generated.id, message: `${request.finalize ? "Finalized" : "Generated"} ${generated.title}.`, metadata: json({ templateVersionId: version.id, outputFormat }) });
  return generated;
}

export async function listGeneratedDocuments(actor: DocumentActor, filters: { documentType?: GeneratedDocumentTemplateType; relatedRecordId?: string } = {}) {
  requireDocumentPermission(actor, "document.download");
  return prisma.generatedDocument.findMany({
    where: {
      ...(filters.documentType ? { documentType: filters.documentType } : {}),
      ...(filters.relatedRecordId ? { OR: [
        { relatedPropertyId: filters.relatedRecordId },
        { relatedUnitId: filters.relatedRecordId },
        { relatedApplicantId: filters.relatedRecordId },
        { relatedTenantId: filters.relatedRecordId },
        { relatedLeaseId: filters.relatedRecordId },
        { relatedMaintenanceId: filters.relatedRecordId },
        { relatedInspectionId: filters.relatedRecordId }
      ] } : {}),
      ...(actor.role === "LANDLORD" ? { generatedById: actor.userId } : {})
    },
    include: { template: true, templateVersion: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function voidGeneratedDocument(actor: DocumentActor, id: string) {
  requireDocumentPermission(actor, "document.void");
  const document = await prisma.generatedDocument.update({ where: { id }, data: { status: GeneratedDocumentStatus.VOIDED, voidedAt: new Date() } });
  await writeAuditLog({ actor, action: AuditAction.STATUS_CHANGE, entityType: "GeneratedDocument", entityId: document.id, message: `Voided generated document ${document.title}.` });
  return document;
}

export async function regenerateDocument(actor: DocumentActor, id: string, mode: "original" | "latest" = "original") {
  const document = await prisma.generatedDocument.findUnique({ where: { id } });
  if (!document) throw new Error("Generated document was not found.");
  const seed = getSeedForTemplateType(document.documentType);
  return generateDocument(actor, {
    templateType: document.documentType,
    outputFormat: document.outputFormat,
    relatedRecordType: RelatedDocumentRecordType.PORTFOLIO,
    relatedRecordId: document.relatedUnitId ?? document.relatedPropertyId ?? document.relatedApplicantId ?? document.relatedTenantId ?? undefined,
    templateId: document.templateId,
    templateVersionId: mode === "original" ? document.templateVersionId : undefined,
    useLatestPublishedVersion: mode === "latest",
    finalize: false,
    filters: { regeneratedFrom: id, templateName: seed.name }
  });
}

export { GeneratedDocumentTemplateType, GeneratedDocumentOutputFormat, RelatedDocumentRecordType, DocumentTemplateEngine };

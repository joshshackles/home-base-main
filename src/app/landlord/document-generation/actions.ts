"use server";

import { redirect } from "next/navigation";
import { GeneratedDocumentOutputFormat, GeneratedDocumentTemplateType, RelatedDocumentRecordType } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { generateDocument } from "@/lib/document-generation/service";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function generateLandlordDocumentAction(formData: FormData) {
  const user = await requireRole(["LANDLORD"], "/landlord/document-generation");
  const from = formString(formData, "from");
  const to = formString(formData, "to");
  const generated = await generateDocument(user, {
    templateType: formString(formData, "templateType") as GeneratedDocumentTemplateType,
    templateId: formString(formData, "templateId"),
    outputFormat: formString(formData, "outputFormat") as GeneratedDocumentOutputFormat,
    relatedRecordType: (formString(formData, "relatedRecordType") as RelatedDocumentRecordType) ?? RelatedDocumentRecordType.PORTFOLIO,
    relatedRecordId: formString(formData, "relatedRecordId"),
    finalize: formString(formData, "finalize") === "true",
    dateRange: {
      from: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
      to: to ? new Date(`${to}T23:59:59.999Z`) : undefined
    }
  });
  redirect(`/landlord/document-generation?generated=${generated.id}`);
}

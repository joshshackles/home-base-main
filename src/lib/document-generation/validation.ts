import type { DocumentDataBuildResult, DocumentFieldRequirement } from "@/lib/document-generation/types";

function readPath(data: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) return (current as Record<string, unknown>)[segment];
    return undefined;
  }, data);
}

export function isMissingValue(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function findMissingFields(data: Record<string, unknown>, requiredFields: DocumentFieldRequirement[]) {
  return requiredFields.filter((field) => isMissingValue(readPath(data, field.key)));
}

export function withMissingFields<TData extends Record<string, unknown>>(result: Omit<DocumentDataBuildResult<TData>, "missingFields">): DocumentDataBuildResult<TData> {
  return {
    ...result,
    missingFields: findMissingFields(result.data, result.requiredFields)
  };
}

export function summarizeMissingFields(fields: DocumentFieldRequirement[]) {
  if (fields.length === 0) return "All required fields are available.";
  return `${fields.length} required field${fields.length === 1 ? "" : "s"} need attention: ${fields.map((field) => field.label).join(", ")}.`;
}

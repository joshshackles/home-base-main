import { DocumentCategory, DocumentRequestStatus, DocumentStatus, DocumentVisibility, Prisma } from "@prisma/client";
import type { AuthorizedUser } from "@/lib/authorization";
import { visibleDocumentRequestWhereForUser, visibleDocumentWhereForUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export type DocumentCenterSearch = {
  q?: string | null;
  category?: string | null;
  status?: string | null;
  visibility?: string | null;
};

export function documentLabel(value: string | null | undefined) {
  if (!value) return "None";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function documentFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function documentStatusTone(status: DocumentStatus | DocumentRequestStatus | string) {
  if (["ACCEPTED", "REVIEWED"].includes(status)) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (status === "REJECTED") return "bg-rose-50 text-rose-800 ring-rose-200";
  if (["REQUESTED", "SUBMITTED", "UPLOADED"].includes(status)) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export const documentInclude = {
  application: { include: { unit: { include: { property: true } } } },
  property: true,
  unit: { include: { property: true } },
  leasePacket: { include: { application: { include: { unit: { include: { property: true } } } } } },
  uploadedBy: true,
  reviewedBy: true
} satisfies Prisma.DocumentInclude;

export type DocumentCenterDocument = Prisma.DocumentGetPayload<{ include: typeof documentInclude }>;

export function documentAttachmentLabel(document: DocumentCenterDocument) {
  if (document.application) return `${document.application.applicantName} application · ${document.application.unit.property.name} #${document.application.unit.unitNumber}`;
  if (document.leasePacket) return `Lease packet · ${document.leasePacket.application.applicantName}`;
  if (document.unit) return `${document.unit.property.name} #${document.unit.unitNumber}`;
  if (document.property) return document.property.name;
  return "Unattached";
}

export function documentAttachmentHref(document: DocumentCenterDocument, base: "admin" | "landlord" | "applicant") {
  if (document.application) return `/${base}/applications/${document.application.id}`;
  if (document.leasePacket) return `/${base}/leases/${document.leasePacket.id}`;
  if (document.unit) return base === "applicant" ? "/applicant/home-tools" : `/${base}/units/${document.unit.id}`;
  if (document.property) return base === "applicant" ? "/applicant/home-tools" : `/${base}/properties/${document.property.id}`;
  return `/${base}/documents`;
}

function enumFilter<T extends string>(value: string | null | undefined, values: readonly T[]) {
  return value && values.includes(value as T) ? (value as T) : undefined;
}

export async function getVisibleDocumentCenter(user: AuthorizedUser, filters: DocumentCenterSearch = {}, take = 80) {
  const visibleWhere = await visibleDocumentWhereForUser(user);
  const requestWhere = await visibleDocumentRequestWhereForUser(user);
  const category = enumFilter(filters.category, Object.values(DocumentCategory));
  const status = enumFilter(filters.status, Object.values(DocumentStatus));
  const visibility = enumFilter(filters.visibility, Object.values(DocumentVisibility));
  const q = filters.q?.trim();

  const searchWhere: Prisma.DocumentWhereInput = {
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(visibility ? { visibility } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { originalName: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { application: { applicantName: { contains: q, mode: "insensitive" } } },
        { application: { applicantEmail: { contains: q, mode: "insensitive" } } },
        { property: { name: { contains: q, mode: "insensitive" } } },
        { unit: { unitNumber: { contains: q, mode: "insensitive" } } }
      ]
    } : {})
  };

  const [documents, requests, counts] = await Promise.all([
    prisma.document.findMany({
      where: { AND: [visibleWhere, searchWhere] },
      include: documentInclude,
      orderBy: { createdAt: "desc" },
      take
    }),
    prisma.documentRequest.findMany({
      where: { AND: [requestWhere, { status: { in: [DocumentRequestStatus.REQUESTED, DocumentRequestStatus.SUBMITTED, DocumentRequestStatus.REJECTED] } }] },
      include: { application: { include: { unit: { include: { property: true } } } }, fulfilledDocument: true, requestedBy: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 24
    }),
    prisma.document.groupBy({
      by: ["status"],
      where: visibleWhere,
      _count: { _all: true }
    })
  ]);

  const total = counts.reduce((sum, row) => sum + row._count._all, 0);
  const accepted = counts.filter((row) => row.status === DocumentStatus.ACCEPTED || row.status === DocumentStatus.REVIEWED).reduce((sum, row) => sum + row._count._all, 0);
  const rejected = counts.find((row) => row.status === DocumentStatus.REJECTED)?._count._all ?? 0;
  const pending = Math.max(total - accepted - rejected, 0);

  return {
    documents,
    requests,
    metrics: {
      total,
      accepted,
      pending,
      rejected,
      openRequests: requests.filter((request) => request.status !== DocumentRequestStatus.ACCEPTED).length
    }
  };
}

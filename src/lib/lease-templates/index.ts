import { LeaseTemplateKind, type LeaseTemplate } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LeaseTemplateScope = "SYSTEM" | "LANDLORD";

export type LeaseTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  body: string;
  kind: LeaseTemplateKind;
  jurisdictionState: string | null;
  ownerUserId: string | null;
  ownerName: string;
  scope: LeaseTemplateScope;
  isActive: boolean;
  isSystem: boolean;
  version: number;
  tokenCount: number;
  clauseCount: number;
  packetCount: number;
  lastUsedAt: Date | null;
  updatedAt: Date;
};

export const LEASE_TEMPLATE_TOKENS = [
  "{{tenant_name}}",
  "{{tenant_email}}",
  "{{property_name}}",
  "{{property_address}}",
  "{{unit_number}}",
  "{{monthly_rent}}",
  "{{security_deposit}}",
  "{{lease_start_date}}",
  "{{lease_end_date}}",
  "{{lease_terms}}",
  "{{landlord_name}}"
];

export function humanizeTemplateKind(kind: LeaseTemplateKind | string) {
  return String(kind).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function extractLeaseTemplateTokens(body: string) {
  return Array.from(new Set(body.match(/{{\s*[a-zA-Z0-9_]+\s*}}/g) ?? [])).sort();
}

export function getLeaseTemplateQuality(template: Pick<LeaseTemplateSummary, "body" | "description" | "clauseCount" | "tokenCount" | "jurisdictionState">) {
  let score = 0;
  if (template.body.length >= 1000) score += 25;
  if (template.description) score += 15;
  if (template.tokenCount >= 5) score += 25;
  if (template.clauseCount > 0) score += 20;
  if (template.jurisdictionState) score += 15;
  return Math.min(100, score);
}

function toSummary(template: LeaseTemplate & { owner?: { name: string | null; email: string } | null; clauses?: { id: string }[]; leasePackets?: { id: string; createdAt: Date }[] }): LeaseTemplateSummary {
  const tokens = extractLeaseTemplateTokens(template.body);
  const packetDates = template.leasePackets?.map((packet) => packet.createdAt).sort((a, b) => b.getTime() - a.getTime()) ?? [];
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    body: template.body,
    kind: template.kind,
    jurisdictionState: template.jurisdictionState,
    ownerUserId: template.ownerUserId,
    ownerName: template.owner?.name ?? template.owner?.email ?? "HomeBase system",
    scope: template.ownerUserId ? "LANDLORD" : "SYSTEM",
    isActive: template.isActive,
    isSystem: template.isSystem,
    version: template.version,
    tokenCount: tokens.length,
    clauseCount: template.clauses?.length ?? 0,
    packetCount: template.leasePackets?.length ?? 0,
    lastUsedAt: template.lastUsedAt ?? packetDates[0] ?? null,
    updatedAt: template.updatedAt
  };
}

export async function getAdminLeaseTemplateLibrary() {
  const templates = await prisma.leaseTemplate.findMany({
    include: {
      owner: { select: { name: true, email: true } },
      clauses: { select: { id: true }, orderBy: { sortOrder: "asc" } },
      leasePackets: { select: { id: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: [{ isActive: "desc" }, { isSystem: "desc" }, { updatedAt: "desc" }]
  });
  const summaries = templates.map(toSummary);
  return {
    templates: summaries,
    metrics: {
      total: summaries.length,
      active: summaries.filter((template) => template.isActive).length,
      system: summaries.filter((template) => template.scope === "SYSTEM").length,
      landlordOwned: summaries.filter((template) => template.scope === "LANDLORD").length,
      packets: summaries.reduce((sum, template) => sum + template.packetCount, 0)
    }
  };
}

export async function getLandlordLeaseTemplateLibrary(ownerUserId: string) {
  const templates = await prisma.leaseTemplate.findMany({
    where: { OR: [{ ownerUserId }, { ownerUserId: null, isActive: true }] },
    include: {
      owner: { select: { name: true, email: true } },
      clauses: { select: { id: true }, orderBy: { sortOrder: "asc" } },
      leasePackets: { select: { id: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: [{ ownerUserId: "desc" }, { isActive: "desc" }, { updatedAt: "desc" }]
  });
  const summaries = templates.map(toSummary);
  return {
    templates: summaries,
    metrics: {
      total: summaries.length,
      active: summaries.filter((template) => template.isActive).length,
      owned: summaries.filter((template) => template.ownerUserId === ownerUserId).length,
      system: summaries.filter((template) => !template.ownerUserId).length
    }
  };
}

export async function getLandlordLeaseTemplateDetail(ownerUserId: string, id: string) {
  const template = await prisma.leaseTemplate.findFirst({
    where: { id, OR: [{ ownerUserId }, { ownerUserId: null, isActive: true }] },
    include: {
      owner: { select: { name: true, email: true } },
      clauses: { orderBy: { sortOrder: "asc" } },
      leasePackets: { select: { id: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 }
    }
  });
  return template ? toSummary(template) : null;
}

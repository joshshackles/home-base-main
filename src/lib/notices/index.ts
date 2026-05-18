import { FormalNoticeAudience, FormalNoticeStatus, FormalNoticeType, UserRole, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

export type NoticeFilters = {
  q?: string;
  status?: string;
  type?: string;
  audience?: string;
  scope?: "mine" | "all";
};

export function noticeStatusLabel(status: FormalNoticeStatus | string) {
  return String(status).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function noticeTypeLabel(type: FormalNoticeType | string) {
  return String(type).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isNoticeActionable(status: FormalNoticeStatus) {
  return [FormalNoticeStatus.DRAFT, FormalNoticeStatus.READY].includes(status);
}

export function isNoticeOverdue(dueAt: Date | null, status: FormalNoticeStatus) {
  return Boolean(dueAt && dueAt < new Date() && ![FormalNoticeStatus.ACKNOWLEDGED, FormalNoticeStatus.CANCELLED, FormalNoticeStatus.EXPIRED].includes(status));
}

export function getNoticeScopeWhere(user: SessionPayload): Prisma.FormalNoticeWhereInput {
  if (user.role === UserRole.ADMIN) return {};
  if (user.role === UserRole.LANDLORD) {
    return {
      OR: [
        { createdById: user.userId },
        { recipientUserId: user.userId },
        { property: { ownerId: user.userId, isArchived: false } },
        { unit: { property: { ownerId: user.userId, isArchived: false } } },
        { application: { unit: { property: { ownerId: user.userId, isArchived: false } } } },
        { leasePacket: { application: { unit: { property: { ownerId: user.userId, isArchived: false } } } } }
      ]
    };
  }
  return {
    OR: [
      { recipientUserId: user.userId },
      { recipientEmail: user.email },
      { application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] } },
      { unit: { tenantUserId: user.userId } }
    ]
  };
}

function filterWhere(filters: NoticeFilters): Prisma.FormalNoticeWhereInput {
  const where: Prisma.FormalNoticeWhereInput = {};
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { body: { contains: filters.q, mode: "insensitive" } },
      { recipientName: { contains: filters.q, mode: "insensitive" } },
      { recipientEmail: { contains: filters.q, mode: "insensitive" } },
      { unit: { unitNumber: { contains: filters.q, mode: "insensitive" } } },
      { unit: { property: { name: { contains: filters.q, mode: "insensitive" } } } }
    ];
  }
  if (filters.status && filters.status !== "ALL") where.status = filters.status as FormalNoticeStatus;
  if (filters.type && filters.type !== "ALL") where.type = filters.type as FormalNoticeType;
  if (filters.audience && filters.audience !== "ALL") where.audience = filters.audience as FormalNoticeAudience;
  return where;
}

export async function getNoticeCenter(user: SessionPayload, filters: NoticeFilters = {}) {
  const scopeWhere = getNoticeScopeWhere(user);
  const where: Prisma.FormalNoticeWhereInput = {
    AND: [scopeWhere, filterWhere(filters), filters.scope === "mine" ? { OR: [{ createdById: user.userId }, { recipientUserId: user.userId }, { recipientEmail: user.email }] } : {}]
  };

  const notices = await prisma.formalNotice.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      recipientUser: { select: { id: true, name: true, email: true, role: true } },
      property: { select: { id: true, name: true, city: true, state: true } },
      unit: { select: { id: true, unitNumber: true, rentAmount: true, property: { select: { name: true, city: true, state: true } } } },
      application: { select: { id: true, applicantName: true, applicantEmail: true, status: true } },
      leasePacket: { select: { id: true, status: true, leaseStartDate: true, leaseEndDate: true, template: { select: { name: true } } } }
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    take: 200
  });

  const now = new Date();
  const base = getNoticeScopeWhere(user);
  const [draft, ready, sent, acknowledged, overdue, expiringSoon] = await Promise.all([
    prisma.formalNotice.count({ where: { AND: [base, { status: FormalNoticeStatus.DRAFT }] } }),
    prisma.formalNotice.count({ where: { AND: [base, { status: FormalNoticeStatus.READY }] } }),
    prisma.formalNotice.count({ where: { AND: [base, { status: FormalNoticeStatus.SENT }] } }),
    prisma.formalNotice.count({ where: { AND: [base, { status: FormalNoticeStatus.ACKNOWLEDGED }] } }),
    prisma.formalNotice.count({ where: { AND: [base, { dueAt: { lt: now }, status: { in: [FormalNoticeStatus.DRAFT, FormalNoticeStatus.READY, FormalNoticeStatus.SENT] } }] } }),
    prisma.formalNotice.count({ where: { AND: [base, { expiresAt: { gte: now, lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, status: { in: [FormalNoticeStatus.READY, FormalNoticeStatus.SENT] } }] } })
  ]);

  return { notices, metrics: { draft, ready, sent, acknowledged, overdue, expiringSoon } };
}

export async function getNoticeFormOptions(user: SessionPayload) {
  const ownerFilter = user.role === UserRole.LANDLORD ? { ownerId: user.userId, isArchived: false } : user.role === UserRole.ADMIN ? { isArchived: false } : { id: "__none__" };
  const [users, properties, units, applications, leasePackets] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, email: true, role: true }, orderBy: [{ role: "asc" }, { email: "asc" }], take: 200 }),
    prisma.property.findMany({ where: ownerFilter, select: { id: true, name: true, city: true, state: true }, orderBy: { name: "asc" }, take: 200 }),
    prisma.unit.findMany({ where: { property: ownerFilter }, select: { id: true, unitNumber: true, property: { select: { name: true, city: true, state: true } } }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }], take: 300 }),
    prisma.application.findMany({ where: user.role === UserRole.LANDLORD ? { unit: { property: { ownerId: user.userId, isArchived: false } } } : {}, select: { id: true, applicantName: true, applicantEmail: true, status: true, unit: { select: { unitNumber: true, property: { select: { name: true } } } } }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.leasePacket.findMany({ where: user.role === UserRole.LANDLORD ? { application: { unit: { property: { ownerId: user.userId, isArchived: false } } } } : {}, select: { id: true, status: true, template: { select: { name: true } }, application: { select: { applicantName: true, unit: { select: { unitNumber: true, property: { select: { name: true } } } } } } }, orderBy: { updatedAt: "desc" }, take: 200 })
  ]);
  return { users, properties, units, applications, leasePackets };
}

export async function canManageNotice(user: SessionPayload, noticeId: string) {
  const notice = await prisma.formalNotice.findFirst({ where: { id: noticeId, AND: [getNoticeScopeWhere(user)] }, select: { id: true } });
  return Boolean(notice);
}

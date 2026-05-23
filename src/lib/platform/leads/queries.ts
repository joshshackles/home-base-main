import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { definePlatformQuery } from "@/lib/platform/service";

type LeadPipelineInput = {
  q?: string | null;
  stage?: string | null;
};

export const landlordLeadInclude = {
  unit: { include: { property: true } },
  application: true,
  notes: { orderBy: { createdAt: "desc" as const }, take: 3 },
  conversations: { orderBy: { lastActivityAt: "desc" as const }, take: 1 }
} satisfies Prisma.LeadInclude;

export type LandlordLeadRecord = Prisma.LeadGetPayload<{ include: typeof landlordLeadInclude }>;

export const leadPipelineStages = [
  { key: "new", title: "New inquiry", detail: "Prospects waiting for first response." },
  { key: "contacted", title: "Contacted", detail: "Conversation started, follow-up still active." },
  { key: "application_started", title: "Application started", detail: "Prospects moving from interest to application." },
  { key: "review", title: "Screening / review", detail: "Submitted or under-review applications." },
  { key: "approved", title: "Approved", detail: "Ready for lease or conversion follow-up." },
  { key: "closed", title: "Closed", detail: "No longer active in the leasing funnel." }
] as const;

export type LeadPipelineStageKey = (typeof leadPipelineStages)[number]["key"];

export function leadPipelineStageFor(lead: LandlordLeadRecord): LeadPipelineStageKey {
  if (lead.status === "CLOSED") return "closed";
  if (lead.application?.status === "APPROVED") return "approved";
  if (lead.application?.status === "SUBMITTED" || lead.application?.status === "UNDER_REVIEW") return "review";
  if (lead.application || lead.status === "APPLICATION_STARTED") return "application_started";
  if (lead.status === "CONTACTED") return "contacted";
  return "new";
}

function leadScopeForActor(actor: { userId: string; role: UserRole }): Prisma.LeadWhereInput {
  if (actor.role === UserRole.ADMIN) return { unit: { property: { isArchived: false } } };
  return { unit: { property: { ownerId: actor.userId, isArchived: false } } };
}

function leadSearchWhere(query: string): Prisma.LeadWhereInput {
  if (!query) return {};

  return {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
      { message: { contains: query, mode: "insensitive" } },
      { unit: { unitNumber: { contains: query, mode: "insensitive" } } },
      { unit: { property: { name: { contains: query, mode: "insensitive" } } } }
    ]
  };
}

export const getLandlordLeadPipelineModel = definePlatformQuery(async (ctx, input: LeadPipelineInput = {}) => {
  const query = input.q?.trim() ?? "";
  const requestedStage = input.stage?.trim() ?? "";
  const activeStage = leadPipelineStages.some((stage) => stage.key === requestedStage) ? requestedStage : "";

  const leads = await prisma.lead.findMany({
    where: {
      AND: [
        leadScopeForActor(ctx.actor),
        leadSearchWhere(query)
      ]
    },
    include: landlordLeadInclude,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });

  const filteredLeads = activeStage ? leads.filter((lead) => leadPipelineStageFor(lead) === activeStage) : leads;
  const stageCounts = leadPipelineStages.reduce<Record<LeadPipelineStageKey, number>>((counts, stage) => {
    counts[stage.key] = leads.filter((lead) => leadPipelineStageFor(lead) === stage.key).length;
    return counts;
  }, { new: 0, contacted: 0, application_started: 0, review: 0, approved: 0, closed: 0 });
  const activeLeads = leads.filter((lead) => !["closed", "approved"].includes(leadPipelineStageFor(lead))).length;
  const applications = leads.filter((lead) => Boolean(lead.application)).length;
  const conversionRate = leads.length > 0 ? Math.round((applications / leads.length) * 100) : 0;
  const unitCount = new Set(leads.map((lead) => lead.unitId)).size;

  return {
    query,
    activeStage,
    leads,
    filteredLeads,
    stageCounts,
    stages: leadPipelineStages,
    metrics: {
      activeLeads,
      applications,
      conversionRate,
      unitCount,
      totalLeads: leads.length
    }
  };
});

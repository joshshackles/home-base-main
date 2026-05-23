import { canAccessApplication } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import type { PlatformContext } from "@/lib/platform/types";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function getLandlordApplicationReviewModel(ctx: PlatformContext, input: { applicationId: string }) {
  const allowed = await canAccessApplication(ctx.actor, input.applicationId);
  if (!allowed) return null;

  const application = await prisma.application.findFirst({
    where: { id: input.applicationId, unit: { property: { isArchived: false } } },
    include: {
      unit: { include: { property: true } },
      lead: true,
      applicantUser: { include: { applicantProfile: { include: { householdMembers: true, incomeSources: true } } } },
      applicationDetail: true,
      notes: { orderBy: { createdAt: "desc" } },
      documentRequests: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      messageThreads: { orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }], take: 3 },
      leasePackets: { include: { template: true, signatureRequests: true }, orderBy: { updatedAt: "desc" } },
      occupancies: { include: { tenant: true }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!application) return null;

  const profile = application.applicantUser?.applicantProfile;
  const householdCount = profile?.householdMembers.length ?? 0;
  const incomeCount = profile?.incomeSources.length ?? 0;
  const missingDocumentRequests = application.documentRequests.filter((request) => request.status === "REQUESTED" || request.status === "REJECTED");
  const pendingSignatures = application.leasePackets.reduce((count, packet) => count + packet.signatureRequests.filter((request) => request.status === "PENDING").length, 0);
  const activeOccupancy = application.occupancies.some((occupancy) => occupancy.status !== "FORMER" && occupancy.status !== "CANCELLED");
  const readinessItems = [
    { label: "Applicant account", complete: Boolean(application.applicantUserId), detail: application.applicantUserId ? "Connected" : "Applicant must sign in or be linked before approval" },
    { label: "Profile authorization", complete: Boolean(application.applicationDetail?.signedAt), detail: application.applicationDetail?.signedAt ? `Signed ${application.applicationDetail.signedAt.toLocaleDateString()}` : "Signature needed" },
    { label: "Household", complete: householdCount > 0 || Boolean(application.applicationDetail), detail: householdCount > 0 ? `${householdCount} household member${householdCount === 1 ? "" : "s"}` : "No household members listed" },
    { label: "Income", complete: incomeCount > 0 || Boolean(profile?.employmentSummary), detail: incomeCount > 0 ? `${incomeCount} income source${incomeCount === 1 ? "" : "s"}` : "Income details not provided" },
    { label: "Requested documents", complete: missingDocumentRequests.length === 0, detail: missingDocumentRequests.length === 0 ? "No open requests" : `${missingDocumentRequests.length} item${missingDocumentRequests.length === 1 ? "" : "s"} need attention` },
    { label: "Decision status", complete: application.status === "SUBMITTED" || application.status === "UNDER_REVIEW" || application.status === "APPROVED", detail: label(application.status) }
  ];
  const readinessScore = Math.round((readinessItems.filter((item) => item.complete).length / readinessItems.length) * 100);
  const canApprove = Boolean(application.applicantUserId) && !activeOccupancy;

  return {
    application,
    profile,
    householdCount,
    incomeCount,
    missingDocumentRequests,
    pendingSignatures,
    activeOccupancy,
    readinessItems,
    readinessScore,
    canApprove
  };
}

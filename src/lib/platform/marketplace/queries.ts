import { UnitStatus } from "@prisma/client";
import { isApplicantMarketplaceViewer } from "@/lib/marketplace/listings";
import {
  getListingQualityGaps,
  getListingQualityScore,
  getMapSearchHref,
  getMonthlyCostEstimate,
  getPublicLocationLabel
} from "@/lib/marketplace/listings";
import { prisma } from "@/lib/prisma";
import type { PlatformActor } from "@/lib/platform/types";

export async function getPublicListingDetailModel(input: { unitId: string; viewer?: PlatformActor | null }) {
  const unit = await prisma.unit.findFirst({
    where: {
      id: input.unitId,
      status: UnitStatus.AVAILABLE,
      marketingStatus: "ACTIVE",
      property: { isArchived: false }
    },
    include: {
      property: true,
      _count: { select: { photos: true, leads: true, applications: true } },
      photos: {
        orderBy: [
          { isFeatured: "desc" },
          { sortOrder: "asc" },
          { createdAt: "asc" }
        ]
      }
    }
  });

  if (!unit) return null;

  const isApplicant = isApplicantMarketplaceViewer(input.viewer ?? null);
  const [favorite, applicantProfile, existingApplication, reusableDocuments] = isApplicant && input.viewer
    ? await Promise.all([
        prisma.favoriteRental.findUnique({
          where: {
            userId_unitId: { userId: input.viewer.userId, unitId: unit.id }
          },
          select: { id: true }
        }),
        prisma.applicantProfile.findUnique({
          where: { userId: input.viewer.userId },
          include: { householdMembers: true, incomeSources: true }
        }),
        prisma.application.findFirst({
          where: {
            unitId: unit.id,
            OR: [
              { applicantUserId: input.viewer.userId },
              { applicantEmail: input.viewer.email.toLowerCase() }
            ],
            status: { not: "WITHDRAWN" }
          },
          select: { id: true, status: true, updatedAt: true }
        }),
        prisma.document.count({
          where: {
            uploadedById: input.viewer.userId,
            status: { in: ["UPLOADED", "REVIEWED", "ACCEPTED"] }
          }
        })
      ])
    : [null, null, null, 0];

  const headline = unit.marketingHeadline || unit.property.name;
  const qualityScore = getListingQualityScore(unit);
  const qualityGaps = getListingQualityGaps(unit);
  const monthlyCost = getMonthlyCostEstimate(unit);
  const mapHref = getMapSearchHref(unit);
  const publicLocation = getPublicLocationLabel(unit);
  const primaryPhoto = unit.photos[0];
  const galleryPhotos = unit.photos.slice(1, 6);
  const availabilityText = unit.availableOn && unit.availableOn > new Date()
    ? unit.availableOn.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "Available now";

  return {
    unit,
    isApplicant,
    favorite,
    applicantProfile,
    existingApplication,
    reusableDocuments,
    headline,
    qualityScore,
    qualityGaps,
    monthlyCost,
    mapHref,
    publicLocation,
    primaryPhoto,
    galleryPhotos,
    availabilityText
  };
}

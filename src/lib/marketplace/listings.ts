import { Prisma, RentalPropertyType, UnitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MarketplaceSearchInput = {
  q?: string;
  city?: string;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  minSqft?: number;
  availability?: string;
  availableBy?: Date;
  voucherFriendly?: boolean;
  pets?: boolean;
  accessibility?: boolean;
  utilities?: boolean;
  rentalType?: string;
};

export type MarketplaceViewer = {
  userId: string;
  role: string;
} | null;

export const MARKETPLACE_RESULT_LIMIT = 48;

export function isApplicantMarketplaceViewer(viewer: MarketplaceViewer) {
  return viewer?.role === "APPLICANT" || viewer?.role === "TENANT";
}

export function getRentalSort(
  sort?: string,
): Prisma.UnitOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }];
    case "rent-desc":
      return [{ rentAmount: "desc" }, { createdAt: "desc" }];
    case "available-soonest":
      return [{ availableOn: "asc" }, { rentAmount: "asc" }];
    case "beds":
      return [{ bedrooms: "desc" }, { rentAmount: "asc" }];
    case "size":
      return [{ squareFeet: "desc" }, { rentAmount: "asc" }];
    case "updated":
      return [{ updatedAt: "desc" }];
    default:
      return [{ rentAmount: "asc" }, { createdAt: "desc" }];
  }
}

export function buildMarketplaceWhere(
  input: MarketplaceSearchInput,
): Prisma.UnitWhereInput {
  const rentalType =
    input.rentalType &&
    Object.values(RentalPropertyType).includes(
      input.rentalType as RentalPropertyType,
    )
      ? (input.rentalType as RentalPropertyType)
      : undefined;
  const andFilters: Prisma.UnitWhereInput[] = [];

  if (input.q) {
    andFilters.push({
      OR: [
        { unitNumber: { contains: input.q, mode: "insensitive" } },
        { description: { contains: input.q, mode: "insensitive" } },
        { marketingHeadline: { contains: input.q, mode: "insensitive" } },
        { marketingHighlights: { contains: input.q, mode: "insensitive" } },
        { utilitiesNote: { contains: input.q, mode: "insensitive" } },
        { petPolicy: { contains: input.q, mode: "insensitive" } },
        { accessibility: { contains: input.q, mode: "insensitive" } },
        { schoolDistrict: { contains: input.q, mode: "insensitive" } },
        { neighborhood: { contains: input.q, mode: "insensitive" } },
        { nearbyFeatures: { contains: input.q, mode: "insensitive" } },
        { parkingInfo: { contains: input.q, mode: "insensitive" } },
        { laundryInfo: { contains: input.q, mode: "insensitive" } },
        { appliancesIncluded: { contains: input.q, mode: "insensitive" } },
        { property: { name: { contains: input.q, mode: "insensitive" } } },
        { property: { city: { contains: input.q, mode: "insensitive" } } },
        { property: { zip: { contains: input.q, mode: "insensitive" } } },
      ],
    });
  }

  if (input.availability === "now") {
    andFilters.push({ OR: [{ availableOn: null }, { availableOn: { lte: new Date() } }] });
  } else if (input.availability === "onOrBefore" && input.availableBy) {
    andFilters.push({ OR: [{ availableOn: null }, { availableOn: { lte: input.availableBy } }] });
  } else if (input.availability === "after" && input.availableBy) {
    andFilters.push({ availableOn: { gt: input.availableBy } });
  }

  return {
    status: UnitStatus.AVAILABLE,
    marketingStatus: "ACTIVE",
    rentAmount: { gt: 0 },
    bedrooms: { gte: 0 },
    bathrooms: { gt: 0 },
    OR: [
      { marketingHeadline: { not: null } },
      { marketingHighlights: { not: null } },
      { description: { not: null } },
      { photos: { some: {} } },
    ],
    ...(andFilters.length ? { AND: andFilters } : {}),
    ...(rentalType ? { rentalType } : {}),
    property: {
      isArchived: false,
      ...(input.city
        ? { city: { contains: input.city, mode: "insensitive" } }
        : {}),
    },
    ...(input.minRent !== undefined || input.maxRent !== undefined
      ? {
          rentAmount: {
            ...(input.minRent !== undefined ? { gte: input.minRent } : {}),
            ...(input.maxRent !== undefined ? { lte: input.maxRent } : {}),
          },
        }
      : {}),
    ...(input.bedrooms !== undefined
      ? { bedrooms: { gte: input.bedrooms } }
      : {}),
    ...(input.bathrooms !== undefined
      ? { bathrooms: { gte: input.bathrooms } }
      : {}),
    ...(input.minSqft !== undefined
      ? { squareFeet: { gte: input.minSqft } }
      : {}),
    ...(input.voucherFriendly ? { voucherFriendly: true } : {}),
    ...(input.pets ? { petPolicy: { not: null } } : {}),
    ...(input.accessibility ? { accessibility: { not: null } } : {}),
    ...(input.utilities ? { utilitiesNote: { not: null } } : {}),
  };
}

export async function getMarketplaceListings(
  where: Prisma.UnitWhereInput,
  take: number,
  skip: number,
  sort?: string,
) {
  const safeTake = Math.min(Math.max(take, 1), MARKETPLACE_RESULT_LIMIT);
  return prisma.unit.findMany({
    where,
    include: {
      property: true,
      _count: { select: { photos: true, leads: true, applications: true } },
      photos: {
        orderBy: [
          { isFeatured: "desc" },
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
        take: 4,
      },
    },
    orderBy: getRentalSort(sort),
    take: safeTake,
    skip,
  });
}

export type RentalListingDTO = Awaited<
  ReturnType<typeof getMarketplaceListings>
>[number];

export async function getMarketplaceStats() {
  const baseWhere: Prisma.UnitWhereInput = {
    status: UnitStatus.AVAILABLE,
    marketingStatus: "ACTIVE",
    rentAmount: { gt: 0 },
    bedrooms: { gte: 0 },
    bathrooms: { gt: 0 },
    OR: [
      { marketingHeadline: { not: null } },
      { marketingHighlights: { not: null } },
      { description: { not: null } },
      { photos: { some: {} } },
    ],
    property: { isArchived: false },
  };

  const [count, aggregate, featureRows, cityRows] = await Promise.all([
    prisma.unit.count({ where: baseWhere }),
    prisma.unit.aggregate({
      where: baseWhere,
      _min: { rentAmount: true },
      _avg: { rentAmount: true },
    }),
    prisma.unit.findMany({
      where: baseWhere,
      select: {
        rentAmount: true,
        voucherFriendly: true,
        petPolicy: true,
        accessibility: true,
        utilitiesNote: true,
        rentalType: true,
      },
      orderBy: { rentAmount: "asc" },
      take: 500,
    }),
    prisma.unit.findMany({
      where: baseWhere,
      select: { property: { select: { city: true, state: true } } },
      orderBy: { property: { city: "asc" } },
      take: 250,
    }),
  ]);

  const rentRows = featureRows
    .map((unit) => unit.rentAmount)
    .sort((a, b) => a - b);

  return {
    count,
    lowestRent: aggregate._min.rentAmount ?? 0,
    averageRent: aggregate._avg.rentAmount
      ? Math.round(aggregate._avg.rentAmount)
      : 0,
    medianRent: rentRows.length ? rentRows[Math.floor(rentRows.length / 2)] : 0,
    voucherFriendlyCount: featureRows.filter((unit) => unit.voucherFriendly)
      .length,
    petFriendlyCount: featureRows.filter((unit) => unit.petPolicy).length,
    utilityNoteCount: featureRows.filter((unit) => unit.utilitiesNote).length,
    cities: Array.from(
      new Map(
        cityRows.map((row) => [
          `${row.property.city}, ${row.property.state}`,
          row.property,
        ]),
      ).values(),
    ).slice(0, 10),
  };
}

export function getListingQualityScore(unit: {
  photos?: unknown[];
  _count?: { photos?: number };
  rentAmount: number;
  deposit: number | null;
  description: string | null;
  marketingHeadline?: string | null;
  marketingHighlights?: string | null;
  utilitiesNote: string | null;
  petPolicy: string | null;
  accessibility: string | null;
  leaseTermsNote?: string | null;
  moveInFeesNote?: string | null;
  squareFeet: number | null;
  parkingInfo?: string | null;
  laundryInfo?: string | null;
}) {
  let score = 0;
  const photoCount = unit._count?.photos ?? unit.photos?.length ?? 0;
  if (photoCount > 0) score += 20;
  if (photoCount >= 5) score += 10;
  if (unit.marketingHeadline) score += 10;
  if (unit.marketingHighlights || unit.description) score += 10;
  if (unit.rentAmount > 0) score += 10;
  if (unit.deposit !== null) score += 7;
  if (unit.squareFeet !== null) score += 7;
  if (unit.utilitiesNote) score += 7;
  if (unit.petPolicy) score += 5;
  if (unit.parkingInfo) score += 5;
  if (unit.laundryInfo) score += 4;
  if (unit.leaseTermsNote || unit.moveInFeesNote) score += 5;
  return Math.min(score, 100);
}

export function getListingQualityGaps(unit: {
  photos?: unknown[];
  _count?: { photos?: number };
  rentAmount: number;
  bedrooms: number;
  bathrooms: number;
  description: string | null;
  marketingHeadline?: string | null;
  marketingHighlights?: string | null;
  availableOn?: Date | null;
  utilitiesNote: string | null;
  squareFeet: number | null;
}) {
  const photoCount = unit._count?.photos ?? unit.photos?.length ?? 0;
  return [
    photoCount === 0 ? "photos" : null,
    !unit.marketingHeadline ? "headline" : null,
    !unit.marketingHighlights && !unit.description ? "description" : null,
    unit.rentAmount <= 0 ? "rent" : null,
    unit.bedrooms < 0 || unit.bathrooms <= 0 ? "bed/bath" : null,
    !unit.availableOn ? "availability date" : null,
    !unit.squareFeet ? "square feet" : null,
    !unit.utilitiesNote ? "utility notes" : null,
  ].filter((gap): gap is string => Boolean(gap));
}

export function getPublicLocationLabel(unit: {
  neighborhood?: string | null;
  property: { city: string; state: string; zip?: string | null };
}) {
  const area = unit.neighborhood?.trim() || unit.property.city;
  const zip = unit.property.zip ? ` ${unit.property.zip}` : "";
  return `${area}, ${unit.property.state}${zip}`;
}

export function getMonthlyCostEstimate(unit: {
  rentAmount: number;
  deposit: number | null;
  averageUtilityBill: number | null;
  moveInFeesNote?: string | null;
}) {
  return {
    monthly: unit.rentAmount + (unit.averageUtilityBill ?? 0),
    moveIn: unit.rentAmount + (unit.deposit ?? 0),
  };
}

export function getMapSearchHref(unit: {
  neighborhood?: string | null;
  property: { city: string; state: string; zip: string };
}) {
  const area = `${unit.neighborhood ? `${unit.neighborhood}, ` : ""}${unit.property.city}, ${unit.property.state} ${unit.property.zip}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(area)}`;
}

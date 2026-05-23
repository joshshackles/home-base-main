import { AccountAccessType } from "@prisma/client";
import type { ShellNavGroup } from "@/components/layout/DashboardShell";
import { propertyManagementNavGroups, simpleLandlordNavGroups } from "@/lib/navigation/first-release";
import { prisma } from "@/lib/prisma";

export type LandlordExperienceMode = "simple" | "property-management";

export type LandlordExperienceConfig = {
  mode: LandlordExperienceMode;
  title: string;
  accountLabel: string;
  shellDescription: string;
  navGroups: ShellNavGroup[];
  homeHref: string;
  consoleHref: string;
  quickCreateHref: string;
  quickCreateLabel: string;
  modeSwitchHref: string;
  modeSwitchLabel: string;
};

const propertyManagementAccessTypes = new Set<AccountAccessType>([
  AccountAccessType.PROPERTY_MANAGER,
  AccountAccessType.ADMIN,
  AccountAccessType.SUPER_USER
]);

export function getLandlordExperienceConfig(mode: LandlordExperienceMode): LandlordExperienceConfig {
  if (mode === "property-management") {
    return {
      mode,
      title: "Property Management Workspace",
      accountLabel: "Portfolio operations",
      shellDescription: "Advanced portfolio controls",
      navGroups: propertyManagementNavGroups,
      homeHref: "/landlord/property-management",
      consoleHref: "/landlord/property-management",
      quickCreateHref: "/landlord/inventory",
      quickCreateLabel: "Open Inventory",
      modeSwitchHref: "/landlord",
      modeSwitchLabel: "Simple Workspace"
    };
  }

  return {
    mode,
    title: "Landlord Workspace",
    accountLabel: "Rental owner workspace",
    shellDescription: "Simple daily view",
    navGroups: simpleLandlordNavGroups,
    homeHref: "/landlord",
    consoleHref: "/landlord/property-management",
    quickCreateHref: "/landlord/rentals/new",
    quickCreateLabel: "Add Rental",
    modeSwitchHref: "/landlord/property-management",
    modeSwitchLabel: "Advanced Workspace"
  };
}

export async function resolveLandlordExperienceMode(userId: string, approvedAccessTypes: AccountAccessType[]): Promise<LandlordExperienceMode> {
  if (approvedAccessTypes.some((accessType) => propertyManagementAccessTypes.has(accessType))) {
    return "property-management";
  }

  const unitCount = await prisma.unit.count({
    where: {
      OR: [
        { property: { ownerId: userId, isArchived: false } },
        { propertyManagerUserId: userId, property: { isArchived: false } }
      ],
      NOT: { status: "ARCHIVED" }
    }
  });

  return unitCount >= 12 ? "property-management" : "simple";
}

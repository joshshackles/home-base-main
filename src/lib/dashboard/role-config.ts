import { AccountAccessType, UserRole } from "@prisma/client";

export type DashboardModule =
  | "applicant"
  | "tenant"
  | "landlord"
  | "inspector"
  | "vendor"
  | "admin";

export const accessTypeToModule: Record<AccountAccessType, DashboardModule> = {
  SUPER_USER: "admin",
  LANDLORD: "landlord",
  PROPERTY_MANAGER: "landlord",
  CASEWORKER: "applicant",
  INSPECTOR: "inspector",
  MAINTENANCE: "vendor",
  VENDOR: "vendor",
  ADMIN: "admin"
};

export const roleToPrimaryModule: Record<UserRole, DashboardModule> = {
  ADMIN: "admin",
  LANDLORD: "landlord",
  APPLICANT: "applicant",
  TENANT: "tenant",
  INSPECTOR: "inspector",
  VENDOR: "vendor"
};

export const moduleHome: Record<DashboardModule, string> = {
  admin: "/admin",
  landlord: "/landlord",
  applicant: "/applicant",
  tenant: "/tenant",
  inspector: "/inspector",
  vendor: "/vendor"
};

export const moduleLabels: Record<DashboardModule, string> = {
  admin: "Platform operations",
  landlord: "Housing operations",
  applicant: "Applicant journey",
  tenant: "Resident home",
  inspector: "Inspection workflow",
  vendor: "Field operations"
};

export function getDashboardHomeForModule(module: DashboardModule) {
  return moduleHome[module];
}

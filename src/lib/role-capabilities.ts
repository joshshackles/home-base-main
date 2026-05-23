import { AccountAccessType, UserRole } from "@prisma/client";
import type { ShellNavGroup } from "@/components/layout/DashboardShell";

export type RoleWorkspace =
  | "applicant"
  | "tenant"
  | "landlord"
  | "caseworker"
  | "inspector"
  | "vendor"
  | "admin"
  | "super-admin";

export type RoleCapabilityKey =
  | "applicant.dashboard"
  | "housing.search"
  | "applicant.profile"
  | "applicant.applications"
  | "applicant.documents"
  | "applicant.messages"
  | "applicant.appointments"
  | "tenant.dashboard"
  | "tenant.lease"
  | "tenant.rent"
  | "tenant.maintenance"
  | "tenant.documents"
  | "tenant.notices"
  | "tenant.inspections"
  | "tenant.messages"
  | "landlord.dashboard"
  | "landlord.properties"
  | "landlord.units"
  | "landlord.listings"
  | "landlord.applications"
  | "landlord.tenants"
  | "landlord.inbox"
  | "landlord.leases"
  | "landlord.documents"
  | "landlord.maintenance"
  | "landlord.inspections"
  | "landlord.vendors"
  | "landlord.reports"
  | "landlord.payments"
  | "landlord.ledger"
  | "landlord.tasks"
  | "landlord.contacts"
  | "landlord.calendar"
  | "landlord.integrations"
  | "landlord.compliance"
  | "landlord.screening"
  | "caseworker.dashboard"
  | "caseworker.clients"
  | "caseworker.applications"
  | "caseworker.documents"
  | "caseworker.messages"
  | "caseworker.referrals"
  | "inspector.dashboard"
  | "inspector.assignments"
  | "inspector.reports"
  | "vendor.dashboard"
  | "vendor.jobs"
  | "vendor.invoices"
  | "vendor.contacts"
  | "admin.command-center"
  | "admin.users"
  | "admin.access-requests"
  | "admin.data-quality"
  | "admin.workflows"
  | "admin.integrations"
  | "admin.reports"
  | "admin.system-health"
  | "super-admin.security"
  | "super-admin.audit"
  | "super-admin.sample-data"
  | "super-admin.platform-settings";

export type RoleCapabilityProfile = {
  workspace: RoleWorkspace;
  label: string;
  landingPath: string;
  description: string;
  capabilities: RoleCapabilityKey[];
  hiddenServices: string[];
};

export type UserCapabilitySet = {
  primaryWorkspace: RoleWorkspace;
  workspaces: RoleWorkspace[];
  capabilities: RoleCapabilityKey[];
  approvedAccessTypes: AccountAccessType[];
};

export const ROLE_CAPABILITY_MAP: Record<RoleWorkspace, RoleCapabilityProfile> = {
  applicant: {
    workspace: "applicant",
    label: "Applicant",
    landingPath: "/applicant",
    description: "Housing search, reusable profile, applications, documents, messages, and appointments.",
    capabilities: ["applicant.dashboard", "housing.search", "applicant.profile", "applicant.applications", "applicant.documents", "applicant.messages", "applicant.appointments"],
    hiddenServices: ["landlord operations", "tenant rent ledger", "inspection administration", "vendor operations", "admin system controls"]
  },
  tenant: {
    workspace: "tenant",
    label: "Tenant",
    landingPath: "/tenant",
    description: "Resident portal for lease, rent, maintenance, messages, documents, notices, and inspections.",
    capabilities: ["tenant.dashboard", "tenant.lease", "tenant.rent", "tenant.maintenance", "tenant.documents", "tenant.notices", "tenant.inspections", "tenant.messages"],
    hiddenServices: ["applicant auto-apply setup", "landlord portfolio tools", "admin operations", "vendor assignment tools"]
  },
  landlord: {
    workspace: "landlord",
    label: "Landlord / Property Manager",
    landingPath: "/landlord",
    description: "Property, unit, listing, applicant, tenant, inbox, lease, maintenance, inspection, vendor, and reporting workflows.",
    capabilities: ["landlord.dashboard", "landlord.properties", "landlord.units", "landlord.listings", "landlord.applications", "landlord.tenants", "landlord.inbox", "landlord.leases", "landlord.documents", "landlord.maintenance", "landlord.inspections", "landlord.vendors", "landlord.reports", "landlord.payments", "landlord.ledger", "landlord.tasks", "landlord.contacts", "landlord.calendar", "landlord.integrations", "landlord.compliance", "landlord.screening"],
    hiddenServices: ["platform-wide user management", "sample data controls", "security audit logs", "unassigned vendor queues"]
  },
  caseworker: {
    workspace: "caseworker",
    label: "Case Manager / Agency User",
    landingPath: "/dashboard",
    description: "Client support, application assistance, referrals, documents, messages, and status tracking.",
    capabilities: ["caseworker.dashboard", "caseworker.clients", "caseworker.applications", "caseworker.documents", "caseworker.messages", "caseworker.referrals"],
    hiddenServices: ["landlord ownership tools", "tenant rent ledger administration", "platform security controls", "vendor payout operations"]
  },
  inspector: {
    workspace: "inspector",
    label: "Inspector",
    landingPath: "/inspector",
    description: "Assigned inspections, details, scheduling, notes, photos, reports, and reinspection status.",
    capabilities: ["inspector.dashboard", "inspector.assignments", "inspector.reports"],
    hiddenServices: ["landlord leasing tools", "tenant profile data", "admin system controls", "vendor invoice tools"]
  },
  vendor: {
    workspace: "vendor",
    label: "Vendor / Maintenance",
    landingPath: "/vendor",
    description: "Assigned jobs, field updates, invoices, contacts, and service records.",
    capabilities: ["vendor.dashboard", "vendor.jobs", "vendor.invoices", "vendor.contacts"],
    hiddenServices: ["landlord ownership tools", "applicant profile data", "admin operations", "inspection authority"]
  },
  admin: {
    workspace: "admin",
    label: "Admin",
    landingPath: "/admin",
    description: "Operational tools, users, access requests, data quality, workflows, integrations, reports, and health.",
    capabilities: ["admin.command-center", "admin.users", "admin.access-requests", "admin.data-quality", "admin.workflows", "admin.integrations", "admin.reports", "admin.system-health"],
    hiddenServices: ["super-admin security controls", "sample data destruction", "platform role configuration"]
  },
  "super-admin": {
    workspace: "super-admin",
    label: "Super Admin / Platform Operator",
    landingPath: "/admin",
    description: "Full system operations, security, audit logs, sample data controls, platform settings, and recovery tools.",
    capabilities: ["admin.command-center", "admin.users", "admin.access-requests", "admin.data-quality", "admin.workflows", "admin.integrations", "admin.reports", "admin.system-health", "super-admin.security", "super-admin.audit", "super-admin.sample-data", "super-admin.platform-settings"],
    hiddenServices: []
  }
};

export const roleToPrimaryWorkspace: Record<UserRole, RoleWorkspace> = {
  ADMIN: "admin",
  LANDLORD: "landlord",
  APPLICANT: "applicant",
  TENANT: "tenant",
  INSPECTOR: "inspector",
  VENDOR: "vendor"
};

export const accessTypeToWorkspace: Record<AccountAccessType, RoleWorkspace> = {
  SUPER_USER: "super-admin",
  LANDLORD: "landlord",
  PROPERTY_MANAGER: "landlord",
  CASEWORKER: "caseworker",
  INSPECTOR: "inspector",
  MAINTENANCE: "vendor",
  VENDOR: "vendor",
  ADMIN: "admin"
};

export function buildCapabilitySet(role: UserRole, approvedAccessTypes: AccountAccessType[] = []): UserCapabilitySet {
  const primaryWorkspace = roleToPrimaryWorkspace[role];
  const workspaces = new Set<RoleWorkspace>([primaryWorkspace]);

  for (const accessType of approvedAccessTypes) {
    workspaces.add(accessTypeToWorkspace[accessType]);
  }

  const capabilities = new Set<RoleCapabilityKey>();
  for (const workspace of workspaces) {
    for (const capability of ROLE_CAPABILITY_MAP[workspace].capabilities) capabilities.add(capability);
  }

  return {
    primaryWorkspace,
    workspaces: [...workspaces],
    capabilities: [...capabilities],
    approvedAccessTypes
  };
}

export function hasCapability(capabilitySet: Pick<UserCapabilitySet, "capabilities">, capability: RoleCapabilityKey) {
  return capabilitySet.capabilities.includes(capability);
}

export function canAccessWorkspace(capabilitySet: Pick<UserCapabilitySet, "workspaces">, workspace: RoleWorkspace) {
  return capabilitySet.workspaces.includes(workspace);
}

export function getHomeForCapabilitySet(capabilitySet: Pick<UserCapabilitySet, "primaryWorkspace">) {
  return ROLE_CAPABILITY_MAP[capabilitySet.primaryWorkspace].landingPath;
}

export function filterNavGroupsByCapabilities(groups: ShellNavGroup[], capabilities: RoleCapabilityKey[]) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.capability || capabilities.includes(item.capability))
    }))
    .filter((group) => group.items.length > 0);
}

export const minimumNecessaryInterfaceRule = "minimum necessary interface";

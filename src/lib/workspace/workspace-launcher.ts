import type { SessionPayload } from "@/lib/auth";
import { getAdminAccessState } from "@/lib/admin/permissions";
import { getUserCapabilitySet } from "@/lib/role-capabilities.server";
import type { RoleCapabilityKey, RoleWorkspace, UserCapabilitySet } from "@/lib/role-capabilities";

export type WorkspaceLauncherCard = {
  id: string;
  label: string;
  eyebrow: string;
  description: string;
  href: string;
  icon: "admin" | "applicant" | "caseworker" | "inspector" | "landlord" | "owner" | "participant" | "tenant" | "vendor";
  priority: number;
  status: "primary" | "available" | "contextual" | "protected";
  requiredCapabilities: RoleCapabilityKey[];
};

export type WorkspaceLauncherModel = {
  userName: string;
  primaryWorkspace: RoleWorkspace;
  cards: WorkspaceLauncherCard[];
  protectedCount: number;
  contextualCount: number;
};

function hasAny(capabilitySet: UserCapabilitySet, capabilities: RoleCapabilityKey[]) {
  return capabilities.length === 0 || capabilities.some((capability) => capabilitySet.capabilities.includes(capability));
}

function hasWorkspace(capabilitySet: UserCapabilitySet, workspace: RoleWorkspace) {
  return capabilitySet.workspaces.includes(workspace);
}

function card(card: WorkspaceLauncherCard) {
  return card;
}

export async function buildWorkspaceLauncher(user: SessionPayload): Promise<WorkspaceLauncherModel> {
  const capabilitySet = await getUserCapabilitySet(user);
  const adminAccess = user.role === "ADMIN" ? await getAdminAccessState(user) : null;
  const cards: WorkspaceLauncherCard[] = [];

  const maybeAdd = (workspaceCard: WorkspaceLauncherCard, predicate: boolean) => {
    if (predicate && !cards.some((existing) => existing.id === workspaceCard.id)) cards.push(workspaceCard);
  };

  maybeAdd(card({
    id: "applicant",
    label: "Renter Workspace",
    eyebrow: "Find and apply",
    description: "Search homes, complete your reusable profile, track applications, upload documents, and message rental teams.",
    href: "/applicant",
    icon: "applicant",
    priority: 10,
    status: capabilitySet.primaryWorkspace === "applicant" ? "primary" : "available",
    requiredCapabilities: ["applicant.dashboard", "applicant.profile", "applicant.applications"]
  }), hasWorkspace(capabilitySet, "applicant"));

  maybeAdd(card({
    id: "tenant",
    label: "Resident Workspace",
    eyebrow: "Current home",
    description: "Manage payments, lease records, maintenance requests, inspections, notices, documents, and landlord messages.",
    href: "/tenant",
    icon: "tenant",
    priority: 20,
    status: capabilitySet.primaryWorkspace === "tenant" ? "primary" : "available",
    requiredCapabilities: ["tenant.dashboard", "tenant.rent", "tenant.maintenance"]
  }), hasWorkspace(capabilitySet, "tenant"));

  maybeAdd(card({
    id: "participant",
    label: "Participant Workspace",
    eyebrow: "Program status",
    description: "Plain-language milestones for paperwork, RFTA packet status, inspection, lease tasks, rent portion, and caseworker messages.",
    href: "/participant",
    icon: "participant",
    priority: 25,
    status: "contextual",
    requiredCapabilities: ["applicant.applications"]
  }), hasAny(capabilitySet, ["applicant.applications", "tenant.dashboard"]));

  maybeAdd(card({
    id: "landlord",
    label: "Landlord Workspace",
    eyebrow: "Rental operations",
    description: "Manage inventory, listings, leads, applications, residents, payments, maintenance, documents, and reports.",
    href: "/landlord",
    icon: "landlord",
    priority: 30,
    status: capabilitySet.primaryWorkspace === "landlord" ? "primary" : "available",
    requiredCapabilities: ["landlord.dashboard", "landlord.units", "landlord.applications"]
  }), hasWorkspace(capabilitySet, "landlord"));

  maybeAdd(card({
    id: "owner",
    label: "Owner Workspace",
    eyebrow: "Executive view",
    description: "Review portfolio performance, financial summary, owner statements, approvals, shared documents, and manager communication.",
    href: "/owner",
    icon: "owner",
    priority: 35,
    status: "contextual",
    requiredCapabilities: ["landlord.reports"]
  }), hasAny(capabilitySet, ["landlord.reports"]));

  maybeAdd(card({
    id: "caseworker",
    label: "Caseworker Workspace",
    eyebrow: "Guided queues",
    description: "Triage assigned cases, missing documents, RFTA packet work, inspections, subsidy touchpoints, and messages.",
    href: "/caseworker",
    icon: "caseworker",
    priority: 40,
    status: capabilitySet.primaryWorkspace === "caseworker" ? "primary" : "available",
    requiredCapabilities: ["caseworker.dashboard", "caseworker.clients"]
  }), hasWorkspace(capabilitySet, "caseworker"));

  maybeAdd(card({
    id: "housing-authority",
    label: "Housing Authority Workspace",
    eyebrow: "Program operations",
    description: "Program cases, RFTA review, inspections, documents, subsidy milestones, affordability items, and payment standards.",
    href: "/housing-authority",
    icon: "caseworker",
    priority: 45,
    status: "contextual",
    requiredCapabilities: ["admin.workflows"]
  }), hasAny(capabilitySet, ["admin.workflows"]));

  maybeAdd(card({
    id: "inspector",
    label: "Inspection Workspace",
    eyebrow: "Field review",
    description: "Open assigned inspections, checklist work, failed items, report completion, and reinspection follow-up.",
    href: "/inspector",
    icon: "inspector",
    priority: 50,
    status: capabilitySet.primaryWorkspace === "inspector" ? "primary" : "available",
    requiredCapabilities: ["inspector.dashboard", "inspector.assignments"]
  }), hasWorkspace(capabilitySet, "inspector"));

  maybeAdd(card({
    id: "vendor",
    label: "Vendor Field Workspace",
    eyebrow: "Mobile work",
    description: "See assigned jobs, urgent work, scheduled visits, estimates, invoices, contacts, and field updates.",
    href: "/vendor",
    icon: "vendor",
    priority: 60,
    status: capabilitySet.primaryWorkspace === "vendor" ? "primary" : "available",
    requiredCapabilities: ["vendor.dashboard", "vendor.jobs"]
  }), hasWorkspace(capabilitySet, "vendor"));

  maybeAdd(card({
    id: "admin",
    label: "Admin Command Center",
    eyebrow: "Operations hub",
    description: "Review users, access requests, workflow exceptions, data quality, integrations, reports, and system health signals.",
    href: "/admin",
    icon: "admin",
    priority: 70,
    status: capabilitySet.primaryWorkspace === "admin" ? "primary" : "available",
    requiredCapabilities: ["admin.command-center"]
  }), hasWorkspace(capabilitySet, "admin"));

  maybeAdd(card({
    id: "super-admin",
    label: "Platform Console",
    eyebrow: "Super admin",
    description: "Protected console for security, audit, integration posture, recovery, sample data, and high-risk platform operations.",
    href: "/admin/platform-operations",
    icon: "admin",
    priority: 80,
    status: "protected",
    requiredCapabilities: ["super-admin.platform-settings", "super-admin.security", "super-admin.audit"]
  }), Boolean(adminAccess?.isSuperUser));

  const sortedCards = cards.sort((a, b) => {
    if (a.status === "primary" && b.status !== "primary") return -1;
    if (b.status === "primary" && a.status !== "primary") return 1;
    return a.priority - b.priority;
  });

  return {
    userName: user.name ?? user.email,
    primaryWorkspace: capabilitySet.primaryWorkspace,
    cards: sortedCards,
    protectedCount: sortedCards.filter((item) => item.status === "protected").length,
    contextualCount: sortedCards.filter((item) => item.status === "contextual").length
  };
}

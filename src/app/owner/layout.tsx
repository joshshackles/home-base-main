export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { WorkspaceShell, type ShellNavGroup } from "@/components/layout/DashboardShell";
import { requireWorkspaceAccess } from "@/lib/role-capabilities.server";

const ownerNavGroups: ShellNavGroup[] = [
  { label: "Owner", items: [
    { href: "/owner", label: "Portfolio", icon: "LayoutDashboard" },
    { href: "/owner#financials", label: "Financial Summary", icon: "DollarSign" },
    { href: "/owner#statements", label: "Statements", icon: "FileText" },
    { href: "/owner#approvals", label: "Approvals", icon: "CheckSquare" }
  ] },
  { label: "Records", items: [
    { href: "/owner#documents", label: "Documents", icon: "FileText" },
    { href: "/owner#activity", label: "Activity", icon: "Activity" },
    { href: "/landlord/inbox", label: "Message Manager", icon: "MessageSquare" },
    { href: "/landlord/reports", label: "Reports", icon: "BarChart3" }
  ] }
];

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  await requireWorkspaceAccess("landlord", "/owner");

  return (
    <WorkspaceShell
      groups={ownerNavGroups}
      title="Owner workspace"
      accountLabel="Executive portfolio view"
      shellDescription="Statements, approvals, documents, and property performance"
      inboxHref="/landlord/inbox"
      quickCreateHref="/landlord/reports"
      quickCreateLabel="Open Reports"
    >
      {children}
    </WorkspaceShell>
  );
}

export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { WorkspaceShell, type ShellNavGroup } from "@/components/layout/DashboardShell";
import { requireUser } from "@/lib/auth";

const participantNavGroups: ShellNavGroup[] = [
  { label: "Program", items: [
    { href: "/participant", label: "Program Status", icon: "LayoutDashboard" },
    { href: "/participant#paperwork", label: "Your Paperwork", icon: "FileText" },
    { href: "/participant#inspection", label: "Your Inspection", icon: "ClipboardCheck" },
    { href: "/participant#rent-portion", label: "Rent Portion", icon: "DollarSign" }
  ] },
  { label: "Next Steps", items: [
    { href: "/participant#messages", label: "Caseworker Messages", icon: "MessageSquare" },
    { href: "/applicant/applications", label: "Applications", icon: "ClipboardList" },
    { href: "/applicant/documents", label: "Documents", icon: "FileText" },
    { href: "/marketplace", label: "Search Homes", icon: "Search" }
  ] }
];

export default async function ParticipantLayout({ children }: { children: ReactNode }) {
  await requireUser("/participant");

  return (
    <WorkspaceShell
      groups={participantNavGroups}
      title="Participant workspace"
      accountLabel="Program participant"
      shellDescription="Voucher, paperwork, inspection, and rent portion"
      inboxHref="/applicant/inbox"
      quickCreateHref="/applicant/documents"
      quickCreateLabel="Upload Paperwork"
    >
      {children}
    </WorkspaceShell>
  );
}

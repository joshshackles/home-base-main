import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { applicantNavGroups } from "@/lib/navigation/first-release";

export const dynamic = "force-dynamic";

export default async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["APPLICANT", "TENANT"], "/applicant");

  return (
    <DashboardShell groups={applicantNavGroups} title="Applicant dashboard" accountLabel="Renter operations" inboxHref="/applicant/inbox" quickCreateHref="/marketplace" quickCreateLabel="Search Rentals">
      {children}
    </DashboardShell>
  );
}

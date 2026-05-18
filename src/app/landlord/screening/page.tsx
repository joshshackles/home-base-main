export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getApplicantScreeningModule, titleCase } from "@/lib/operations/modules";
import { OperationsModuleView, unitLabel, money } from "@/components/operations/OperationsModuleView";

export default async function Page() {
  const user = await requireRole(["LANDLORD"], "/landlord/screening");
  const data = await getApplicantScreeningModule(user.userId);
  return <OperationsModuleView title="Applicant screening" eyebrow="Update 9" description="Background checks, income verification, rental history, references, and configurable screening packages in one review queue." metrics={[{ label: "Applications", value: data.counts.applications }, { label: "Screenings", value: data.counts.screenings }, { label: "Pending review", value: data.counts.pending, tone: data.counts.pending ? "warn" : "good" }, { label: "Verification items", value: data.counts.income + data.counts.rentalHistory + data.counts.references + data.counts.background }]} sections={[{ title: "Screening queue", empty: "No screening requests have been ordered yet.", rows: data.screenings.map((item) => ({ title: item.application.applicantName, subtitle: item.package?.name ?? item.providerName ?? "Custom screening", meta: item.recommendation ?? item.riskSummary ?? "Awaiting package results", status: item.status })) }, { title: "Open applications", empty: "No applications are ready for screening.", rows: data.applications.map((item) => ({ title: item.applicantName, subtitle: unitLabel(item.unit), meta: item.applicantEmail, status: item.status })) }, { title: "Screening packages", empty: "Create packages for background, eviction, income, rental history, and references.", rows: data.packages.map((item) => ({ title: item.name, subtitle: item.description ?? "Reusable screening package", meta: money(item.priceCents), status: item.isActive ? "ACTIVE" : "DISABLED" })) }]} />;
}

export const dynamic = "force-dynamic";

import Link from "next/link";
import { uploadLandlordDocument } from "@/app/landlord/actions";
import { DocumentCenterView } from "@/components/documents/DocumentCenterView";
import { requireRole } from "@/lib/auth";
import { getLandlordDocumentCenterModel, platformContext } from "@/lib/platform";

export default async function LandlordDocumentsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/documents");
  const { center, units, applications, leasePackets, documentCategoryOptions, documentVisibilityOptions, leaseSummary } = await getLandlordDocumentCenterModel(platformContext(user), searchParams);
  // Platform document service preserves legacy scoped selectors: ownerId: user.userId, isArchived: false, NOT: { status: "ARCHIVED" }.
  const leaseWorkflowPanel = (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700">Lease workflow</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Signature queue and lease packets</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Track lease packets, pending signatures, completed leases, and packet documents from the same document center.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/landlord/leases" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white hover:bg-brand-700">Open Signature Queue</Link>
          <Link href="/landlord/lease-templates" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-800 hover:bg-slate-50">Lease Templates</Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <LeaseMetric label="Lease packets" value={leaseSummary.packetCount} detail="All active packet records" />
        <LeaseMetric label="Pending signatures" value={leaseSummary.pendingSignatureCount} detail="Tenant or landlord signature requests" warn={leaseSummary.pendingSignatureCount > 0} />
        <LeaseMetric label="Completed leases" value={leaseSummary.completedLeases} detail="Fully completed packets" />
        <LeaseMetric label="Packet documents" value={leaseSummary.packetDocumentCount} detail="Files linked to lease packets" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {leasePackets.slice(0, 6).map((packet) => {
          const pending = packet.signatureRequests.filter((request) => request.status === "PENDING").length;
          return (
            <Link key={packet.id} href={`/landlord/leases/${packet.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-brand-200 hover:bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{packet.template.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{packet.application.applicantName} - {packet.application.unit.property.name} #{packet.application.unit.unitNumber}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${pending > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{pending > 0 ? `${pending} pending` : packet.status.replaceAll("_", " ")}</span>
              </div>
              <p className="mt-3 text-xs font-bold uppercase text-slate-500">Updated {packet.updatedAt.toLocaleDateString()}</p>
            </Link>
          );
        })}
        {leasePackets.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Lease packets will appear here after an applicant is approved and a lease handoff is created.</p> : null}
      </div>
    </div>
  );

  const uploadPanel = (
    <form action={uploadLandlordDocument} encType="multipart/form-data" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-lg font-black text-slate-950">Upload owner file</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">Attach leases, notices, inspection files, receipts, or rental documents to a portfolio record.</p>
      <div className="mt-4 space-y-3">
        <input name="title" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" placeholder="Document title" required />
        <select name="category" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue="LANDLORD_DOCUMENT">{documentCategoryOptions.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}</option>)}</select>
        <select name="visibility" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue="LANDLORD">{documentVisibilityOptions.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}</option>)}</select>
        <select name="applicationId" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue=""><option value="">No application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.applicantName} · {application.unit.property.name} #{application.unit.unitNumber}</option>)}</select>
        <select name="unitId" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue=""><option value="">Portfolio-wide</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} #{unit.unitNumber}</option>)}</select>
        <select name="leasePacketId" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue=""><option value="">No lease packet</option>{leasePackets.map((packet) => <option key={packet.id} value={packet.id}>{packet.template.name} · {packet.application.applicantName}</option>)}</select>
        <input name="file" type="file" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" required />
        <input name="notes" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" placeholder="Optional note" />
        <button className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white hover:bg-brand-700">Upload document</button>
      </div>
    </form>
  );

  return <DocumentCenterView title="Lease & Document Center" description="A portfolio-wide document center for leases, signatures, notices, applications, statements, receipts, inspection media, and tenant files." basePath="landlord" documents={center.documents} requests={center.requests} metrics={center.metrics} searchParams={searchParams} uploadPanel={uploadPanel} workflowPanel={leaseWorkflowPanel} />;
}

function LeaseMetric({ label, value, detail, warn = false }: { label: string; value: number; detail: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-950"}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-xs font-semibold leading-5 opacity-75">{detail}</p>
    </div>
  );
}

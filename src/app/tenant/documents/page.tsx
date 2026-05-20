export const dynamic = "force-dynamic";

import { DocumentCategory } from "@prisma/client";
import { uploadApplicantDocument } from "@/app/applicant/actions";
import { DocumentCenterView } from "@/components/documents/DocumentCenterView";
import { requireRole } from "@/lib/auth";
import { getVisibleDocumentCenter } from "@/lib/documents/center";
import { prisma } from "@/lib/prisma";

function getParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function TenantDocumentsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["TENANT"], "/tenant/documents");
  const [center, applications] = await Promise.all([
    getVisibleDocumentCenter(user, {
      q: getParam(searchParams, "q"),
      category: getParam(searchParams, "category"),
      status: getParam(searchParams, "status")
    }),
    prisma.application.findMany({
      where: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] },
      include: { unit: { include: { property: true } } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const uploadPanel = (
    <form action={uploadApplicantDocument} encType="multipart/form-data" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-lg font-black text-slate-950">Upload resident file</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">Add receipts, lease materials, IDs, or requested records to a housing file connected to your tenancy.</p>
      <div className="mt-4 space-y-3">
        <select name="applicationId" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" required>
          <option value="">Choose housing file</option>
          {applications.map((application) => <option key={application.id} value={application.id}>{application.unit.property.name} #{application.unit.unitNumber} - {label(application.status)}</option>)}
        </select>
        <input name="title" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" placeholder="Document title" required />
        <select name="category" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue="OTHER">
          {Object.values(DocumentCategory).filter((category) => !(category === "LANDLORD_DOCUMENT" || category === "RFTA" || category === "UTILITY_ALLOWANCE")).map((category) => <option key={category} value={category}>{label(category)}</option>)}
        </select>
        <input name="file" type="file" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" required />
        <input name="notes" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" placeholder="Optional note" />
        <button className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white hover:bg-brand-700">Upload document</button>
      </div>
    </form>
  );

  return (
    <DocumentCenterView
      title="Resident documents"
      description="A secure resident document hub for leases, notices, rent records, maintenance files, inspections, and documents shared by your housing team."
      basePath="tenant"
      documents={center.documents}
      requests={center.requests}
      metrics={center.metrics}
      searchParams={searchParams}
      uploadPanel={uploadPanel}
    />
  );
}

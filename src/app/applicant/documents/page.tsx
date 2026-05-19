export const dynamic = "force-dynamic";

import { DocumentCategory } from "@prisma/client";
import { uploadApplicantDocument } from "@/app/applicant/actions";
import { DocumentCenterView } from "@/components/documents/DocumentCenterView";
import { requireUser } from "@/lib/auth";
import { getVisibleDocumentCenter } from "@/lib/documents/center";
import { prisma } from "@/lib/prisma";

function getParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ApplicantDocumentsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireUser("/applicant/documents");
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
      <p className="text-lg font-black text-slate-950">Upload renter file</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">Add IDs, proof of income, receipts, or other files to an active application.</p>
      <div className="mt-4 space-y-3">
        <select name="applicationId" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" required>
          <option value="">Choose application</option>
          {applications.map((application) => <option key={application.id} value={application.id}>{application.unit.property.name} #{application.unit.unitNumber} · {application.status}</option>)}
        </select>
        <input name="title" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" placeholder="Document title" required />
        <select name="category" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue="OTHER">
          {Object.values(DocumentCategory).filter((category) => !(category === "LANDLORD_DOCUMENT" || category === "RFTA" || category === "UTILITY_ALLOWANCE")).map((category) => <option key={category} value={category}>{category.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}</option>)}
        </select>
        <input name="file" type="file" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" required />
        <input name="notes" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" placeholder="Optional note" />
        <button className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white hover:bg-brand-700">Upload document</button>
      </div>
    </form>
  );

  return <DocumentCenterView title="My documents" description="A secure renter document hub for application uploads, lease packets, receipts, notices, and files shared by the housing team." basePath="applicant" documents={center.documents} requests={center.requests} metrics={center.metrics} searchParams={searchParams} uploadPanel={uploadPanel} />;
}

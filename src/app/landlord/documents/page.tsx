export const dynamic = "force-dynamic";

import { DocumentCategory, DocumentVisibility } from "@prisma/client";
import { uploadLandlordDocument } from "@/app/landlord/actions";
import { DocumentCenterView } from "@/components/documents/DocumentCenterView";
import { requireRole } from "@/lib/auth";
import { getVisibleDocumentCenter } from "@/lib/documents/center";
import { prisma } from "@/lib/prisma";

function getParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LandlordDocumentsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(["LANDLORD"], "/landlord/documents");
  const [center, properties, units, applications, leasePackets] = await Promise.all([
    getVisibleDocumentCenter(user, {
      q: getParam(searchParams, "q"),
      category: getParam(searchParams, "category"),
      status: getParam(searchParams, "status")
    }),
    prisma.property.findMany({ where: { ownerId: user.userId, isArchived: false }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { property: { ownerId: user.userId, isArchived: false }, NOT: { status: "ARCHIVED" } }, include: { property: true }, orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }] }),
    prisma.application.findMany({ where: { unit: { property: { ownerId: user.userId, isArchived: false } } }, include: { unit: { include: { property: true } } }, orderBy: { createdAt: "desc" }, take: 120 }),
    prisma.leasePacket.findMany({ where: { application: { unit: { property: { ownerId: user.userId, isArchived: false } } } }, include: { template: { select: { name: true } }, application: { include: { unit: { include: { property: true } } } } }, orderBy: { createdAt: "desc" }, take: 120 })
  ]);

  const uploadPanel = (
    <form action={uploadLandlordDocument} encType="multipart/form-data" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-lg font-black text-slate-950">Upload owner file</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">Attach leases, notices, inspection files, receipts, or rental documents to a portfolio record.</p>
      <div className="mt-4 space-y-3">
        <input name="title" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" placeholder="Document title" required />
        <select name="category" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue="LANDLORD_DOCUMENT">{Object.values(DocumentCategory).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}</option>)}</select>
        <select name="visibility" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue="LANDLORD">{Object.values(DocumentVisibility).filter((value) => value !== "INTERNAL").map((value) => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}</option>)}</select>
        <select name="applicationId" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue=""><option value="">No application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.applicantName} · {application.unit.property.name} #{application.unit.unitNumber}</option>)}</select>
        <select name="propertyId" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue=""><option value="">No property group</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select>
        <select name="unitId" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue=""><option value="">No rental</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.property.name} #{unit.unitNumber}</option>)}</select>
        <select name="leasePacketId" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold" defaultValue=""><option value="">No lease packet</option>{leasePackets.map((packet) => <option key={packet.id} value={packet.id}>{packet.template.name} · {packet.application.applicantName}</option>)}</select>
        <input name="file" type="file" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" required />
        <input name="notes" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" placeholder="Optional note" />
        <button className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black text-white hover:bg-brand-700">Upload document</button>
      </div>
    </form>
  );

  return <DocumentCenterView title="Rental documents" description="A portfolio-wide document center for leases, notices, applications, statements, receipts, inspection media, and tenant files." basePath="landlord" documents={center.documents} requests={center.requests} metrics={center.metrics} searchParams={searchParams} uploadPanel={uploadPanel} />;
}

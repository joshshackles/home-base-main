export const dynamic = "force-dynamic";

import Link from "next/link";
import { SignatureStatus } from "@prisma/client";
import { ArrowRight, CheckCircle2, Clock3, FileSignature, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function LandlordLeasesPage() {
  const user = await requireRole(["LANDLORD"], "/landlord/leases");
  const requests = await prisma.signatureRequest.findMany({
    where: {
      signerRole: "LANDLORD",
      leasePacket: { application: { unit: { property: { ownerId: user.userId, isArchived: false } } } }
    },
    include: {
      leasePacket: {
        include: {
          template: true,
          documents: { select: { id: true } },
          signatureRequests: true,
          application: { include: { unit: { include: { property: true } } } }
        }
      }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  const pending = requests.filter((request) => request.status === SignatureStatus.PENDING);
  const signed = requests.filter((request) => request.status === SignatureStatus.SIGNED);
  const blocked = requests.filter((request) => request.status === SignatureStatus.DECLINED || request.status === SignatureStatus.EXPIRED || request.status === SignatureStatus.VOIDED);

  return (
    <main id="main-content" className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-700">Documents & Leases</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Signature Queue</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">Review landlord signature requests, lease packet status, tenant signature progress, and linked packet documents.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/landlord/documents" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white hover:bg-brand-700">Document Center</Link>
            <Link href="/landlord/lease-templates" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-800 hover:bg-slate-50">Templates</Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<FileSignature size={18} />} label="Signature requests" value={requests.length} detail="Assigned to landlord" />
          <Metric icon={<Clock3 size={18} />} label="Pending" value={pending.length} detail="Needs signature" warn={pending.length > 0} />
          <Metric icon={<CheckCircle2 size={18} />} label="Signed" value={signed.length} detail="Completed by landlord" />
          <Metric icon={<FileText size={18} />} label="Exceptions" value={blocked.length} detail="Declined, voided, or expired" warn={blocked.length > 0} />
        </div>
      </section>

      <section className="mt-5 grid gap-4">
        {requests.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <FileSignature className="mx-auto text-brand-700" size={34} />
            <h2 className="mt-3 text-2xl font-black text-slate-950">No lease signatures are waiting</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">Landlord signature requests will appear here after an approved application creates a lease packet and signature handoff.</p>
            <Link href="/landlord/documents" className="mt-4 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white hover:bg-brand-700">Open Document Center</Link>
          </div>
        ) : requests.map((request) => {
          const tenantPending = request.leasePacket.signatureRequests.filter((signature) => signature.signerRole === "TENANT" && signature.status === "PENDING").length;
          return (
            <article key={request.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${request.status === "PENDING" ? "bg-amber-100 text-amber-900" : request.status === "SIGNED" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{label(request.status)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">{label(request.leasePacket.status)}</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-black text-slate-950">{request.leasePacket.application.unit.property.name} #{request.leasePacket.application.unit.unitNumber}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{request.leasePacket.template.name} for {request.leasePacket.application.applicantName}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <Info label="Landlord signer" value={request.signerName} />
                    <Info label="Tenant pending" value={String(tenantPending)} />
                    <Info label="Packet docs" value={String(request.leasePacket.documents.length)} />
                  </div>
                  {request.status === SignatureStatus.SIGNED && request.signedAt ? <p className="mt-3 text-sm font-bold text-emerald-700">Signed {request.signedAt.toLocaleString()}</p> : null}
                </div>
                <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Next action</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{request.status === "PENDING" ? "Review and sign lease" : request.status === "SIGNED" ? "Monitor tenant signatures" : "Review exception"}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Signature evidence, consent text, and packet status are stored with the lease record.</p>
                  <Link href={`/landlord/leases/${request.leasePacketId}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white hover:bg-brand-700">Open Lease <ArrowRight size={15} /></Link>
                </aside>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function Metric({ icon, label, value, detail, warn = false }: { icon: React.ReactNode; label: string; value: number; detail: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-950"}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">{icon}</div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-80">{detail}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white p-3"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div>;
}

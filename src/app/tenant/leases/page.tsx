export const dynamic = "force-dynamic";

import Link from "next/link";
import { SignatureStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function TenantLeasesPage() {
  const user = await requireRole(["TENANT"], "/tenant/leases");
  const requests = await prisma.signatureRequest.findMany({
    where: {
      OR: [{ signerUserId: user.userId }, { signerEmail: user.email }],
      signerRole: "TENANT",
      leasePacket: {
        application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] }
      }
    },
    include: {
      leasePacket: {
        include: {
          application: { include: { unit: { include: { property: true } } } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-200">Resident lease center</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Leases and signatures</h1>
        <p className="mt-3 max-w-3xl text-slate-300">Review current lease packets, signature requests, and signed lease documents connected to your tenancy.</p>
      </div>

      <section className="mt-8 space-y-4">
        {requests.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">No lease packets are waiting</h2>
            <p className="mt-2 text-slate-600">Signed leases and new signature requests will appear here when your landlord shares them.</p>
          </div>
        ) : requests.map((request) => (
          <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label(request.status)}</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{request.leasePacket.application.unit.property.name} #{request.leasePacket.application.unit.unitNumber}</h2>
                <p className="mt-1 text-sm text-slate-600">{request.leasePacket.application.unit.property.addressLine}, {request.leasePacket.application.unit.property.city}</p>
                {request.status === SignatureStatus.SIGNED && request.signedAt ? <p className="mt-2 text-sm font-bold text-emerald-700">Signed {request.signedAt.toLocaleString()}</p> : null}
              </div>
              <Link href={`/tenant/leases/${request.leasePacketId}`} className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Open Lease</Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

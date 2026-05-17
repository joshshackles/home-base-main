import { notFound } from "next/navigation";
import { SignatureStatus } from "@prisma/client";
import { signApplicantLease } from "@/app/applicant/actions";
import { Field, inputClass } from "@/components/admin/FormFields";
import { requireRole } from "@/lib/auth";
import { renderLeaseTemplate } from "@/lib/lease-render";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function ApplicantLeaseDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/leases");
  const packet = await prisma.leasePacket.findFirst({
    where: {
      id: params.id,
      application: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] }
    },
    include: {
      template: true,
      application: { include: { applicantUser: true, unit: { include: { property: { include: { owner: true } } } } } },
      signatureRequests: { orderBy: { createdAt: "asc" } },
      documents: { where: { visibility: { in: ["APPLICANT", "SHARED"] } }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!packet) notFound();
  const request = packet.signatureRequests.find((item) => item.signerRole === "TENANT" && (item.signerUserId === user.userId || item.signerEmail === user.email));
  const preview = renderLeaseTemplate(packet);
  const isExpired = Boolean(request?.expiresAt && request.expiresAt < new Date() && request.status === SignatureStatus.PENDING);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-200">Lease Review</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">{packet.application.unit.property.name} #{packet.application.unit.unitNumber}</h1>
        <p className="mt-3 text-slate-300">Status: {label(packet.status)}</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Lease preview</h2>
          <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-6 font-serif text-sm leading-8 text-slate-900">{preview}</pre>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Your signature</h2>
            {!request ? <p className="mt-3 text-sm text-slate-600">No tenant signature request is assigned to you.</p> : isExpired ? (
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-900">
                <p className="text-sm font-bold uppercase">Expired</p>
                <p className="mt-2 text-sm">This signature request expired on {request.expiresAt?.toLocaleDateString()}. Please contact the administrator for a new or extended request.</p>
              </div>
            ) : request.status === SignatureStatus.SIGNED ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
                <p className="text-sm font-bold uppercase">Signed</p>
                <p className="mt-2 font-serif text-xl">{request.signatureText}</p>
                <p className="mt-2 text-xs font-bold">{request.signedAt?.toLocaleString()}</p>
              </div>
            ) : request.status === SignatureStatus.PENDING ? (
              <form action={signApplicantLease} className="mt-5 space-y-4">
                <input type="hidden" name="requestId" value={request.id} />
                <Field label="Type your full legal signature"><input name="signatureText" className={inputClass} placeholder={packet.application.applicantName} required /></Field>
                <p className="text-xs leading-5 text-slate-500">By submitting, you are recording an electronic signature for this lease packet in this system. {request.expiresAt ? `This request expires ${request.expiresAt.toLocaleDateString()}.` : ""}</p>
                <button type="submit" className="w-full rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700">Sign Lease</button>
              </form>
            ) : <p className="mt-3 text-sm text-slate-600">Signature request status: {label(request.status)}</p>}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Lease documents</h2>
            <div className="mt-4 space-y-3">
              {packet.documents.length === 0 ? <p className="text-sm text-slate-600">No downloadable lease documents are available yet.</p> : packet.documents.map((document) => (
                <a key={document.id} href={`/api/documents/${document.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-950 hover:bg-slate-100">{document.title}</a>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

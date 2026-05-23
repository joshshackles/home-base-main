export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, MessageSquare, Search, ShieldCheck } from "lucide-react";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: string) {
  if (status === "SUBMITTED") return "bg-blue-100 text-blue-800";
  if (status === "UNDER_REVIEW") return "bg-amber-100 text-amber-900";
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-800";
  if (status === "DENIED" || status === "WITHDRAWN") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

export default async function LandlordApplicationsPage() {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const applications = await prisma.application.findMany({
    where: { unit: { property: { ownerId: user.userId, isArchived: false } } },
    include: {
      unit: { include: { property: true } },
      lead: true,
      applicationDetail: true,
      applicantUser: { include: { applicantProfile: { include: { householdMembers: true, incomeSources: true } } } },
      notes: { select: { id: true } },
      messageThreads: { select: { id: true, status: true, lastMessageAt: true }, orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }], take: 1 },
      documents: { select: { id: true, status: true } }
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
  });

  const active = applications.filter((application) => ["STARTED", "SUBMITTED", "UNDER_REVIEW"].includes(application.status));
  const submitted = applications.filter((application) => application.status === "SUBMITTED");
  const signed = applications.filter((application) => application.applicationDetail?.signedAt);
  const withMessages = applications.filter((application) => application.messageThreads.length > 0);

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="Applications" description="Review applicant packets, authorization status, messages, documents, and next review actions without opening every record first." />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active" value={active.length} detail="Started, submitted, or under review" />
        <Metric label="Submitted" value={submitted.length} detail="Ready for landlord review" />
        <Metric label="Signed packets" value={signed.length} detail="Reusable profile authorized" />
        <Metric label="With messages" value={withMessages.length} detail="Applicant context available" />
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Review queue</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Sorted to make submitted and in-review packets easy to scan. Open a card for full renter details, notes, approval, and tenant activation.</p>
          </div>
          <Link href="/landlord/inbox" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"><MessageSquare size={16} /> Inbox</Link>
        </div>

        <div className="mt-5 grid gap-4">
          {applications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <ClipboardList className="mx-auto text-slate-400" size={34} />
              <h3 className="mt-3 text-xl font-black text-slate-950">No applications yet</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">No renter applications are active right now. New marketplace applications are listed here with packet, document, message, and unit context.</p>
              <Link href="/landlord/rentals" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">Check listing health</Link>
            </div>
          ) : applications.map((application) => {
            const profile = application.applicantUser?.applicantProfile;
            const householdCount = profile?.householdMembers.length ?? 0;
            const incomeCount = profile?.incomeSources.length ?? 0;
            const thread = application.messageThreads[0];
            return (
              <article key={application.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-slate-950">{application.applicantName}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(application.status)}`}>{label(application.status)}</span>
                      {application.applicationDetail?.signedAt ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase text-emerald-800"><ShieldCheck size={13} /> Authorized</span> : <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase text-amber-900">Signature needed</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{application.applicantEmail}{application.applicantPhone ? ` / ${application.applicantPhone}` : ""}</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{application.unit.property.name} #{application.unit.unitNumber} - {formatCurrency(application.unit.rentAmount)} / month</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      <Signal label="Household" value={householdCount} />
                      <Signal label="Income" value={incomeCount} />
                      <Signal label="Docs" value={application.documents.length} />
                      <Signal label="Notes" value={application.notes.length} />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <Info label="Move-in" value={application.applicationDetail?.requestedMoveInDate ? application.applicationDetail.requestedMoveInDate.toLocaleDateString() : "Not provided"} />
                      <Info label="Voucher / agency" value={[application.applicationDetail?.voucherProgram, application.applicationDetail?.voucherAgency].filter(Boolean).join(" / ") || "Not provided"} />
                      <Info label="Vehicle" value={[application.applicationDetail?.vehicleYear, application.applicationDetail?.vehicleMake, application.applicationDetail?.vehicleModel].filter(Boolean).join(" ") || "Not provided"} />
                      <Info label="Application message" value={application.summary || application.lead?.message || "No summary provided."} />
                    </div>
                  </div>
                  <aside className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-black uppercase text-slate-500">Next action</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{application.status === "SUBMITTED" ? "Review applicant packet" : application.status === "STARTED" ? "Wait for applicant completion" : "Continue review"}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{thread ? `${label(thread.status)} message thread ${thread.lastMessageAt ? `updated ${thread.lastMessageAt.toLocaleDateString()}` : "available"}.` : "No applicant message thread yet."}</p>
                    <div className="mt-4 grid gap-2">
                      <Link href={`/landlord/applications/${application.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">Open packet <ArrowRight size={15} /></Link>
                      {thread ? <Link href={`/landlord/inbox?thread=${thread.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"><MessageSquare size={15} /> Reply</Link> : null}
                      <Link href={`/landlord/rentals/${application.unit.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"><Search size={15} /> Unit</Link>
                    </div>
                  </aside>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white p-3 text-center"><p className="text-xl font-black text-slate-950">{value}</p><p className="text-xs font-black uppercase text-slate-500">{label}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-800">{value}</p></div>;
}

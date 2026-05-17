import Link from "next/link";
import { ApplicationStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function ApplicantDashboardPage() {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant");
  const [profile, applications, submittedCount] = await Promise.all([
    prisma.applicantProfile.findUnique({
      where: { userId: user.userId },
      include: { householdMembers: true, incomeSources: true }
    }),
    prisma.application.findMany({
      where: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }] },
      include: { unit: { include: { property: true } }, documentRequests: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.application.count({ where: { OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }], status: ApplicationStatus.SUBMITTED } })
  ]);

  const active = applications.filter((application) => !["APPROVED", "DENIED", "WITHDRAWN"].includes(application.status)).length;
  const missingDocuments = applications.reduce((total, application) => total + application.documentRequests.filter((request) => ["REQUESTED", "REJECTED"].includes(request.status)).length, 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-200">Applicant portal</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Welcome, {user.name || "Applicant"}</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-300">Complete your profile, review your applications, and submit your application package when your household and income details are ready.</p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase text-slate-500">Applications</p>
          <p className="mt-2 text-4xl font-black text-slate-950">{applications.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase text-slate-500">Active</p>
          <p className="mt-2 text-4xl font-black text-slate-950">{active}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase text-slate-500">Submitted</p>
          <p className="mt-2 text-4xl font-black text-slate-950">{submittedCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase text-slate-500">Missing Docs</p>
          <p className="mt-2 text-4xl font-black text-slate-950">{missingDocuments}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-slate-950">Recent applications</h2>
            <Link href="/applicant/applications" className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">View All</Link>
          </div>
          <div className="mt-5 space-y-3">
            {applications.slice(0, 5).length === 0 ? <p className="text-slate-600">No applications are connected to your account yet.</p> : applications.slice(0, 5).map((application) => (
              <Link key={application.id} href={`/applicant/applications/${application.id}`} className="block rounded-2xl border border-slate-200 p-4 hover:border-brand-200 hover:bg-brand-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{application.unit.property.name} #{application.unit.unitNumber}</p>
                    <p className="mt-1 text-sm text-slate-600">{application.unit.property.city}, {application.unit.property.state} · {formatCurrency(application.unit.rentAmount)}</p>
                  </div>
                  <div className="text-right"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(application.status)}</span><p className="mt-2 text-xs font-bold text-slate-500">{application.documentRequests.filter((request) => ["REQUESTED", "REJECTED"].includes(request.status)).length} missing docs</p></div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Profile readiness</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <p className="rounded-2xl bg-slate-50 p-3"><strong>Basic profile:</strong> {profile ? "Started" : "Not started"}</p>
            <p className="rounded-2xl bg-slate-50 p-3"><strong>Household members:</strong> {profile?.householdMembers.length ?? 0}</p>
            <p className="rounded-2xl bg-slate-50 p-3"><strong>Income sources:</strong> {profile?.incomeSources.length ?? 0}</p>
          </div>
          <Link href="/applicant/profile" className="mt-5 inline-flex w-full justify-center rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">Update Profile</Link>
        </aside>
      </section>
    </main>
  );
}

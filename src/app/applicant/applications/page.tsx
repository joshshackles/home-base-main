export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildApplicationReadiness } from "@/lib/application-readiness";

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function ApplicantApplicationsPage({ searchParams }: { searchParams?: { submitted?: string } }) {
  const user = await requireRole(
    ["APPLICANT", "TENANT"],
    "/applicant/applications",
  );
  const [applications, profile] = await Promise.all([
    prisma.application.findMany({
      where: {
        OR: [{ applicantUserId: user.userId }, { applicantEmail: user.email }],
      },
      include: {
        unit: { include: { property: true } },
        notes: true,
        documentRequests: { select: { status: true } },
        applicationDetail: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.applicantProfile.findUnique({
      where: { userId: user.userId },
      include: { householdMembers: true, incomeSources: true },
    }),
  ]);

  return (
    <main
      id="main-content"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-brand-700">
            Applicant portal
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            My applications
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Review every application connected to your account and continue the
            next step when ready.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 hover:bg-slate-50"
        >
          Browse Listings
        </Link>
      </div>
      {searchParams?.submitted === "1" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">
          Application submitted. It is now in the review queue.
        </div>
      ) : null}

      <div className="mt-8 grid gap-4">
        {applications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            No applications are connected to your applicant account yet.
          </div>
        ) : (
          applications.map((application) => {
            const readiness = buildApplicationReadiness(
              profile,
              application.documentRequests,
              application.applicationDetail,
            );
            return (
              <Link
                key={application.id}
                href={`/applicant/applications/${application.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-brand-200 hover:bg-brand-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">
                      {application.unit.property.name} #
                      {application.unit.unitNumber}
                    </h2>
                    <p className="mt-1 text-slate-600">
                      {application.unit.property.addressLine},{" "}
                      {application.unit.property.city},{" "}
                      {application.unit.property.state}
                    </p>
                    <p className="mt-3 text-lg font-black text-slate-950">
                      {formatCurrency(application.unit.rentAmount)} / month
                    </p>
                    <div className="mt-4 max-w-xl">
                      <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
                        <span>Application readiness</span>
                        <span>{readiness.score}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${readiness.score}%` }}
                        />
                      </div>
                      {readiness.requiredMissing.length > 0 ? (
                        <p className="mt-2 text-sm text-slate-600">
                          Next: {readiness.requiredMissing[0].label}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-emerald-700">
                          Ready to submit or already in review.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">
                      {label(application.status)}
                    </span>
                    <p className="mt-3 text-sm text-slate-500">
                      {application.notes.length} notes
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}

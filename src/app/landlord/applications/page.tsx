import Link from "next/link";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function LandlordApplicationsPage() {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const applications = await prisma.application.findMany({
    where: { unit: { property: { ownerId: user.userId, isArchived: false } } },
    include: { unit: { include: { property: true } }, lead: true, notes: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title="My Applications" description="View application records connected to your assigned units and add landlord notes for the admin team." />
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Applicant</th>
              <th className="px-5 py-4">Unit</th>
              <th className="px-5 py-4">Rent</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Notes</th>
              <th className="px-5 py-4">Created</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {applications.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-600">No applications have been started for your units yet.</td></tr>
            ) : applications.map((application) => (
              <tr key={application.id} className="align-top hover:bg-slate-50">
                <td className="px-5 py-4"><p className="font-bold text-slate-950">{application.applicantName}</p><p className="mt-1 text-slate-600">{application.applicantEmail}</p></td>
                <td className="px-5 py-4"><Link href={`/marketplace/${application.unit.id}`} className="font-bold text-brand-700 hover:underline">{application.unit.property.name} #{application.unit.unitNumber}</Link><p className="mt-1 text-xs text-slate-500">{application.unit.property.city}, {application.unit.property.state}</p></td>
                <td className="px-5 py-4 font-bold text-slate-950">{formatCurrency(application.unit.rentAmount)}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{label(application.status)}</span></td>
                <td className="px-5 py-4 text-slate-600">{application.notes.length}</td>
                <td className="px-5 py-4 text-slate-600">{application.createdAt.toLocaleDateString()}</td>
                <td className="px-5 py-4"><Link href={`/landlord/applications/${application.id}`} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

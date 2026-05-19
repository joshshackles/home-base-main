export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateValue(value: Date | null | undefined) {
  return value ? value.toLocaleDateString() : "Not provided";
}

function valueOrAsk(value: string | number | null | undefined) {
  if (value === null || typeof value === "undefined" || value === "") return "Not provided";
  return String(value);
}

export default async function LandlordTenantDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["LANDLORD"], `/landlord/tenants/${params.id}`);
  const occupancy = await prisma.occupancy.findFirst({
    where: { id: params.id, unit: { property: { ownerId: user.userId, isArchived: false } } },
    include: {
      tenant: { include: { applicantProfile: { include: { householdMembers: true, incomeSources: true } } } },
      unit: { include: { property: true } },
      application: { include: { applicationDetail: true, documents: { orderBy: { createdAt: "desc" } } } },
      leasePacket: true
    }
  });
  if (!occupancy) notFound();

  const detail = occupancy.application?.applicationDetail;
  const profile = occupancy.tenant.applicantProfile;

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title={occupancy.tenant.name ?? occupancy.tenant.email} description="Complete renter record with contact, unit, application packet, household, income, vehicle, voucher, lease, and document context." actionHref="/landlord/tenants" actionLabel="Back to tenants" />
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Renter information</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Info label="Email" value={occupancy.tenant.email} />
              <Info label="Phone" value={valueOrAsk(profile?.phone)} />
              <Info label="Occupancy" value={label(occupancy.status)} />
              <Info label="Move-in" value={dateValue(occupancy.moveInDate)} />
              <Info label="Lease start" value={dateValue(occupancy.leaseStartDate)} />
              <Info label="Lease end" value={dateValue(occupancy.leaseEndDate)} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Application packet</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Info label="Date of birth" value={dateValue(detail?.dateOfBirth)} />
              <Info label="Government ID" value={valueOrAsk(detail?.governmentIdType)} />
              <Info label="DL state" value={valueOrAsk(detail?.driversLicenseState)} />
              <Info label="DL number" value={valueOrAsk(detail?.driversLicenseNumber)} />
              <Info label="Emergency contact" value={valueOrAsk(detail?.emergencyContactName)} />
              <Info label="Emergency phone" value={valueOrAsk(detail?.emergencyContactPhone)} />
              <Info label="Voucher program" value={valueOrAsk(detail?.voucherProgram)} />
              <Info label="Housing agency" value={valueOrAsk(detail?.voucherAgency)} />
              <Info label="Case worker" value={valueOrAsk(detail?.voucherCaseWorker)} />
              <Info label="Case worker contact" value={valueOrAsk(detail?.voucherCaseWorkerContact)} />
              <Info label="Vehicle" value={[detail?.vehicleYear, detail?.vehicleColor, detail?.vehicleMake, detail?.vehicleModel].filter(Boolean).join(" ") || "Not provided"} />
              <Info label="License plate" value={[detail?.licensePlateState, detail?.licensePlateNumber].filter(Boolean).join(" ") || "Not provided"} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextBlock label="Reason for moving" value={detail?.reasonForMoving} />
              <TextBlock label="Rental history" value={profile?.rentalHistory} />
              <TextBlock label="Employment summary" value={profile?.employmentSummary} />
              <TextBlock label="Vehicle notes" value={detail?.vehicleInfo} />
              <TextBlock label="Pets" value={detail?.petDetails ?? profile?.pets} />
              <TextBlock label="Accommodation details" value={detail?.serviceAnimalAccommodation ?? profile?.accessibilityNeeds} />
              <TextBlock label="Landlord references" value={profile?.landlordReferences} />
              <TextBlock label="Renter bio" value={profile?.renterBio} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Household and income</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Household</p>
                <div className="mt-2 space-y-2 text-sm text-slate-700">{profile?.householdMembers.length ? profile.householdMembers.map((member) => <p key={member.id}><strong>{member.name}</strong> - {label(member.relationship)}{member.age !== null ? `, age ${member.age}` : ""}</p>) : <p>None listed.</p>}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Income</p>
                <div className="mt-2 space-y-2 text-sm text-slate-700">{profile?.incomeSources.length ? profile.incomeSources.map((income) => <p key={income.id}><strong>{income.sourceName}</strong> - {formatCurrency(income.amount)} {label(income.frequency)}</p>) : <p>None listed.</p>}</div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Rental</h2>
            <p className="mt-3 text-lg font-bold text-slate-950">{occupancy.unit.property.name} #{occupancy.unit.unitNumber}</p>
            <p className="text-slate-600">{occupancy.unit.property.addressLine}, {occupancy.unit.property.city}, {occupancy.unit.property.state}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{formatCurrency(occupancy.unit.rentAmount)}</p>
            <Link href={`/landlord/rentals/${occupancy.unit.id}`} className="mt-4 inline-flex w-full justify-center rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">Open rental</Link>
          </div>
          {occupancy.application ? (
            <Link href={`/landlord/applications/${occupancy.application.id}`} className="block rounded-3xl border border-brand-100 bg-brand-50 p-6 text-center font-black text-brand-900 shadow-sm hover:bg-brand-100">Open source application</Link>
          ) : null}
          {occupancy.leasePacket ? (
            <Link href={`/landlord/leases/${occupancy.leasePacket.id}`} className="block rounded-3xl border border-slate-200 bg-white p-6 text-center font-black text-slate-900 shadow-sm hover:bg-slate-50">Open lease packet</Link>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>;
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 leading-7 text-slate-700">{value || "Not provided."}</p></div>;
}

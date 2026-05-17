export const dynamic = "force-dynamic";

import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AccountAccessType, MaintenancePriority, MessageThreadType, UserRole } from "@prisma/client";
import { addLandlordUnitContact, assignLandlordUnitStaff, assignLandlordUnitTenant, createLandlordMaintenanceRequest, deleteLandlordUnitPhoto, setFeaturedLandlordUnitPhoto, updateLandlordUnitTerms, uploadLandlordUnitPhotos } from "@/app/landlord/actions";
import { sendWorkflowMessage } from "@/app/workflow-actions";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { formatCurrency } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { agingBucket, ledgerBalance, ledgerStatusLabel, ledgerTypeLabel } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateLabel(value: Date | null | undefined) {
  return value ? value.toLocaleDateString() : "Not set";
}

function userOptionLabel(user: { name: string | null; email: string }) {
  return user.name ? `${user.name} (${user.email})` : user.email;
}

function hasStaffAccess(user: { role: UserRole; accountAccessRequests: Array<{ type: AccountAccessType }> }, types: AccountAccessType[]) {
  if (user.role === UserRole.ADMIN || user.role === UserRole.LANDLORD) return true;
  if (types.includes(AccountAccessType.MAINTENANCE) && user.role === UserRole.INSPECTOR) return true;
  return user.accountAccessRequests.some((request) => types.includes(request.type));
}

export default async function LandlordUnitDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { repair?: string; photos?: string } }) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const unit = await prisma.unit.findFirst({
    where: { id: params.id, property: { ownerId: user.userId, isArchived: false }, NOT: { status: "ARCHIVED" } },
    include: {
      property: true,
      tenantUser: true,
      propertyManager: true,
      maintenanceUser: true,
      caseworker: true,
      currentApplication: { include: { applicantUser: true } },
      applications: { orderBy: { updatedAt: "desc" }, include: { applicantUser: true } },
      photos: { orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }
    }
  });

  if (!unit) notFound();

  const applicationIds = Array.from(new Set([unit.currentApplicationId, ...unit.applications.map((application) => application.id)].filter(Boolean) as string[]));
  const primaryApplication = unit.currentApplication ?? unit.applications[0] ?? null;
  const tenantName = unit.tenantUser?.name ?? unit.currentApplication?.applicantName ?? unit.tenantUser?.email ?? unit.currentApplication?.applicantEmail ?? "No tenant assigned";

  const [leasePackets, ledgerEntries, paymentPlans, maintenanceRequests, messageThreads, tenants, staffUsers] = await Promise.all([
    prisma.leasePacket.findMany({
      where: { applicationId: { in: applicationIds.length > 0 ? applicationIds : ["none"] } },
      include: { template: true, application: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.ledgerEntry.findMany({
      where: { unitId: unit.id },
      include: { tenantUser: true, application: true },
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      take: 20
    }),
    prisma.paymentPlan.findMany({
      where: { unitId: unit.id },
      include: { tenantUser: true, application: true, installments: { orderBy: { dueDate: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.maintenanceRequest.findMany({
      where: { unitId: unit.id },
      include: { requester: { select: { name: true, email: true } }, assignedTo: { select: { name: true, email: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 8
    }),
    prisma.messageThread.findMany({
      where: {
        OR: [
          { applicationId: { in: applicationIds.length > 0 ? applicationIds : ["none"] } },
          { maintenanceRequest: { unitId: unit.id } },
          { createdById: user.userId, applicationId: { in: applicationIds.length > 0 ? applicationIds : ["none"] } }
        ]
      },
      include: {
        messages: { include: { sender: { select: { name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 3 }
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 6
    }),
    prisma.user.findMany({
      where: {
        role: { in: [UserRole.APPLICANT, UserRole.TENANT] },
        isActive: true,
        OR: [
          { applications: { some: { unit: { property: { ownerId: user.userId } } } } },
          { tenantLedgerEntries: { some: { unit: { property: { ownerId: user.userId } } } } },
          { currentTenantUnits: { some: { property: { ownerId: user.userId } } } }
        ]
      },
      orderBy: { email: "asc" },
      select: { id: true, name: true, email: true }
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { in: [UserRole.ADMIN, UserRole.LANDLORD, UserRole.INSPECTOR] } },
          { accountAccessRequests: { some: { status: "APPROVED", type: { in: [AccountAccessType.PROPERTY_MANAGER, AccountAccessType.CASEWORKER, AccountAccessType.MAINTENANCE, AccountAccessType.VENDOR] } } } }
        ]
      },
      orderBy: { email: "asc" },
      select: { id: true, name: true, email: true, role: true, accountAccessRequests: { where: { status: "APPROVED" }, select: { type: true } } }
    })
  ]);

  const balance = ledgerBalance(ledgerEntries);
  const payments = ledgerEntries.filter((entry) => entry.type === "PAYMENT" || entry.type === "CREDIT");
  const repairCreated = searchParams?.repair === "created";
  const photoStatus = searchParams?.photos;
  const moveInTotal = unit.rentAmount + (unit.deposit ?? 0);
  const tenantHistory = unit.applications.filter((application) => application.id !== primaryApplication?.id);
  const featuredPhoto = unit.photos[0];
  const staffContacts = [
    unit.propertyManager ? `Property manager: ${unit.propertyManager.name || unit.propertyManager.email} - ${unit.propertyManager.email}` : null,
    unit.maintenanceUser ? `Maintenance: ${unit.maintenanceUser.name || unit.maintenanceUser.email} - ${unit.maintenanceUser.email}` : null,
    unit.caseworker ? `Caseworker: ${unit.caseworker.name || unit.caseworker.email} - ${unit.caseworker.email}` : null
  ].filter(Boolean) as string[];
  const propertyManagerOptions = staffUsers.filter((staff) => hasStaffAccess(staff, [AccountAccessType.PROPERTY_MANAGER, AccountAccessType.LANDLORD]));
  const maintenanceOptions = staffUsers.filter((staff) => hasStaffAccess(staff, [AccountAccessType.MAINTENANCE, AccountAccessType.VENDOR]));
  const caseworkerOptions = staffUsers.filter((staff) => hasStaffAccess(staff, [AccountAccessType.CASEWORKER]));

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title={`${unit.property.name} #${unit.unitNumber}`} description={`${unit.property.addressLine}, ${unit.property.city}, ${unit.property.state} ${unit.property.zip}`} actionHref="/landlord/units" actionLabel="Back to units" />

      <section className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[360px_1fr]">
          <div className="min-h-72 bg-slate-100">
            {featuredPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/unit-photos/${featuredPhoto.id}`} alt={`${unit.property.name} ${unit.unitNumber}`} className="h-full min-h-72 w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-72 items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-brand-700 text-sm font-black uppercase tracking-[0.25em] text-white/80">Add unit photo</div>
            )}
          </div>
          <div className="p-6 lg:p-8">
            <p className="text-sm font-black uppercase tracking-wide text-brand-700">Unit profile</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">{unit.property.name}</h1>
            <p className="mt-2 text-lg font-bold text-slate-700">Unit {unit.unitNumber} - {unit.property.addressLine}</p>
            <p className="mt-1 text-slate-600">{unit.property.city}, {unit.property.state} {unit.property.zip}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Info label="Beds / baths" value={`${unit.bedrooms} bd / ${unit.bathrooms} ba`} />
              <Info label="Rent" value={formatCurrency(unit.rentAmount)} />
              <Info label="Status" value={label(unit.status)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat label="Status" value={label(unit.status)} />
        <Stat label="Public listing" value={unit.status === "AVAILABLE" ? "Live" : "Private"} />
        <Stat label="Rent" value={formatCurrency(unit.rentAmount)} />
        <Stat label="Balance" value={formatCurrency(balance)} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Photos">
            {photoStatus ? <p className="mb-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-900">Photo library updated.</p> : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unit.photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/unit-photos/${photo.id}`} alt={`${unit.property.name} photo`} className="aspect-[4/3] w-full object-cover" />
                  <div className="space-y-2 p-3">
                    {photo.isFeatured ? <p className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase text-brand-700">Featured photo</p> : null}
                    <div className="flex gap-2">
                      <form action={setFeaturedLandlordUnitPhoto} className="flex-1">
                        <input type="hidden" name="id" value={unit.id} />
                        <input type="hidden" name="photoId" value={photo.id} />
                        <button className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-white" type="submit">Feature</button>
                      </form>
                      <form action={deleteLandlordUnitPhoto}>
                        <input type="hidden" name="id" value={unit.id} />
                        <input type="hidden" name="photoId" value={photo.id} />
                        <button className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50" type="submit">Delete</button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
              {unit.photos.length === 0 ? <p className="rounded-3xl border border-dashed border-slate-300 p-6 text-slate-600">No listing photos yet. Add clear exterior, kitchen, bath, bedroom, living area, parking, yard, and neighborhood photos.</p> : null}
            </div>
            <form action={uploadLandlordUnitPhotos} className="mt-5 rounded-2xl bg-slate-50 p-4">
              <input type="hidden" name="id" value={unit.id} />
              <label className="block text-sm font-black text-slate-950">Upload photos ({unit.photos.length}/12)</label>
              <input name="photos" type="file" multiple accept="image/*" className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" />
              <button type="submit" className="mt-3 rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Upload Photos</button>
            </form>
          </Panel>

          <Panel title="Tenant">
            {searchParams?.tenant === "assigned" ? <p className="mb-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-900">Tenant assigned and unit marked occupied.</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="Name" value={tenantName} />
              <Info label="Email" value={unit.tenantUser?.email ?? unit.currentApplication?.applicantEmail ?? "Not linked"} />
              <Info label="Phone" value={unit.currentApplication?.applicantPhone ?? "Not provided"} />
              <Info label="Application" value={primaryApplication ? `${primaryApplication.applicantName} - ${label(primaryApplication.status)}` : "No application linked"} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {primaryApplication ? <Link href={`/landlord/applications/${primaryApplication.id}`} className="rounded-2xl bg-slate-950 px-4 py-2 font-bold text-white hover:bg-slate-800">Tenant Info</Link> : null}
              <Link href={`/landlord/units/${unit.id}/edit`} className="rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">Edit Assignment</Link>
              {unit.status === "AVAILABLE" ? <Link href={`/marketplace/${unit.id}`} className="rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">Public Listing</Link> : null}
            </div>
            <form action={assignLandlordUnitTenant} className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
              <input type="hidden" name="unitId" value={unit.id} />
              <label className="block md:col-span-2">
                <span className="text-sm font-bold text-slate-700">Assign existing tenant</span>
                <select name="tenantUserId" defaultValue={unit.tenantUserId ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3">
                  <option value="">Use new tenant details below</option>
                  {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{userOptionLabel(tenant)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">New tenant name</span>
                <input name="tenantName" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Jane Tenant" />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">New tenant email</span>
                <input name="tenantEmail" type="email" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="tenant@example.com" />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Phone</span>
                <input name="tenantPhone" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="417-555-0000" />
              </label>
              <div className="flex items-end">
                <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Assign Tenant</button>
              </div>
              <p className="text-sm leading-6 text-slate-600 md:col-span-2">Assigning a tenant marks the unit occupied. If the email is new, HomeBase creates the tenant record and emails a secure join link.</p>
            </form>
          </Panel>

          <Panel title="Rent, Deposit, and Move-In Terms">
            {searchParams?.terms === "updated" ? <p className="mb-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-900">Rent and move-in terms updated.</p> : null}
            <div className="grid gap-4 md:grid-cols-3">
              <Info label="Monthly rent" value={formatCurrency(unit.rentAmount)} />
              <Info label="Deposit" value={unit.deposit ? formatCurrency(unit.deposit) : "Not set"} />
              <Info label="Estimated move-in" value={formatCurrency(moveInTotal)} />
              <Info label="Rent due day" value={unit.rentDueDay ? `Day ${unit.rentDueDay}` : "Not set"} />
              <Info label="Average utilities" value={unit.averageUtilityBill ? formatCurrency(unit.averageUtilityBill) : "Not set"} />
              <Info label="Late fee policy" value={unit.lateFeePolicy ?? "Not set"} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Info label="Lease terms" value={unit.leaseTermsNote ?? "Not set"} />
              <Info label="Move-in fees" value={unit.moveInFeesNote ?? "Not set"} />
            </div>
            <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer font-black text-slate-950">Unlock and edit financial terms</summary>
              <form action={updateLandlordUnitTerms} className="mt-4 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="unitId" value={unit.id} />
                <label className="block"><span className="text-sm font-bold text-slate-700">Monthly rent</span><input name="rentAmount" type="number" min="0" defaultValue={unit.rentAmount} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" /></label>
                <label className="block"><span className="text-sm font-bold text-slate-700">Deposit</span><input name="deposit" type="number" min="0" defaultValue={unit.deposit ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" /></label>
                <label className="block"><span className="text-sm font-bold text-slate-700">Average utilities</span><input name="averageUtilityBill" type="number" min="0" defaultValue={unit.averageUtilityBill ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" /></label>
                <label className="block"><span className="text-sm font-bold text-slate-700">Rent due day</span><input name="rentDueDay" type="number" min="1" max="31" defaultValue={unit.rentDueDay ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" /></label>
                <label className="block md:col-span-2"><span className="text-sm font-bold text-slate-700">Lease terms</span><textarea name="leaseTermsNote" rows={3} defaultValue={unit.leaseTermsNote ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" /></label>
                <label className="block"><span className="text-sm font-bold text-slate-700">Move-in fees</span><textarea name="moveInFeesNote" rows={3} defaultValue={unit.moveInFeesNote ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" /></label>
                <label className="block"><span className="text-sm font-bold text-slate-700">Late fee policy</span><textarea name="lateFeePolicy" rows={3} defaultValue={unit.lateFeePolicy ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3" /></label>
                <button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 md:col-span-2" type="submit">Save Terms</button>
              </form>
            </details>
          </Panel>

          <Panel title="Listing and Location Details">
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="School district" value={unit.schoolDistrict ?? "Not set"} />
              <Info label="Neighborhood" value={unit.neighborhood ?? "Not set"} />
              <Info label="Year built" value={unit.yearBuilt ? String(unit.yearBuilt) : "Not set"} />
              <Info label="Roof age" value={unit.roofAgeYears !== null ? `${unit.roofAgeYears} years` : "Not set"} />
              <Info label="Parking" value={unit.parkingInfo ?? "Not set"} />
              <Info label="Laundry" value={unit.laundryInfo ?? "Not set"} />
              <Info label="Appliances" value={unit.appliancesIncluded ?? "Not set"} />
              <Info label="Flooring / finishes" value={unit.flooringInfo ?? "Not set"} />
              <Info label="Yard / outdoor" value={unit.yardInfo ?? "Not set"} />
              <Info label="Smoking policy" value={unit.smokingPolicy ?? "Not set"} />
            </div>
            <Info label="Nearby features" value={unit.nearbyFeatures ?? "Not set"} />
          </Panel>

          <Panel title="Tenant History">
            {tenantHistory.length === 0 ? (
              <p className="text-slate-600">No previous tenant/application history is connected to this unit yet.</p>
            ) : (
              <div className="space-y-3">
                {tenantHistory.map((application) => (
                  <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                    <div>
                      <p className="font-black text-slate-950">{application.applicantName}</p>
                      <p className="text-sm text-slate-600">{application.applicantEmail} - {label(application.status)} - updated {dateLabel(application.updatedAt)}</p>
                    </div>
                    <Link href={`/landlord/applications/${application.id}`} className="rounded-xl border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50">Open</Link>
                  </div>
                ))}
              </div>
            )}
            {unit.previousTenantNotes ? <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{unit.previousTenantNotes}</p> : null}
          </Panel>

          <Panel title="Lease">
            {leasePackets.length === 0 ? (
              <p className="text-slate-600">No lease packet is linked to this unit yet.</p>
            ) : (
              <div className="space-y-3">
                {leasePackets.map((packet) => (
                  <div key={packet.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                    <div>
                      <p className="font-black text-slate-950">{packet.template.name}</p>
                      <p className="text-sm text-slate-600">{packet.application.applicantName} - {label(packet.status)} - {formatCurrency(packet.monthlyRent)}/mo</p>
                    </div>
                    <Link href={`/landlord/leases/${packet.id}`} className="rounded-xl bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700">Open Lease</Link>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Payment History">
            {payments.length === 0 ? (
              <p className="text-slate-600">No payments or credits are posted for this unit yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Date</th><th className="py-2">Description</th><th className="py-2">Status</th><th className="py-2 text-right">Amount</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((entry) => (
                      <tr key={entry.id}><td className="py-3 text-slate-600">{dateLabel(entry.paidAt ?? entry.postedAt)}</td><td className="py-3 font-semibold text-slate-900">{entry.description}</td><td className="py-3">{ledgerStatusLabel(entry.status)}</td><td className="py-3 text-right font-black">{formatCurrency(entry.amount)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link href="/landlord/ledger" className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">Open Ledger</Link>
          </Panel>

          <Panel title="Ledger">
            {ledgerEntries.length === 0 ? (
              <p className="text-slate-600">No ledger activity is connected to this unit yet.</p>
            ) : (
              <div className="space-y-3">
                {ledgerEntries.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-black text-slate-950">{ledgerTypeLabel(entry.type)} - {entry.description}</p>
                      <p className="font-black text-slate-950">{formatCurrency(entry.amount)}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{dateLabel(entry.dueDate ?? entry.postedAt)} - {agingBucket(entry.dueDate)} - {entry.application?.applicantName ?? entry.tenantUser?.name ?? "No tenant linked"}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Payment Plans">
            {paymentPlans.length === 0 ? (
              <p className="text-slate-600">No payment plans are connected to this unit yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {paymentPlans.map((plan) => {
                  const remaining = plan.installments.filter((item) => item.status === "DUE" || item.status === "MISSED").reduce((sum, item) => sum + item.amount, 0);
                  return (
                    <div key={plan.id} className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-xs font-bold uppercase text-brand-700">{label(plan.status)}</p>
                      <h3 className="mt-1 font-black text-slate-950">{plan.name}</h3>
                      <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(remaining)}</p>
                      <p className="text-sm text-slate-500">{plan.installments.length} installments</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Repairs">
            {repairCreated ? <p className="mb-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-900">Repair request created.</p> : null}
            <form action={createLandlordMaintenanceRequest} className="grid gap-3 rounded-2xl bg-slate-50 p-4">
              <input type="hidden" name="unitId" value={unit.id} />
              <input type="hidden" name="applicationId" value={primaryApplication?.id ?? ""} />
              <input name="subject" required className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Repair subject" />
              <select name="priority" defaultValue={MaintenancePriority.NORMAL} className="rounded-2xl border border-slate-300 px-4 py-3">
                {Object.values(MaintenancePriority).map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}
              </select>
              <textarea name="description" required rows={4} className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Describe the repair or maintenance need." />
              <textarea name="accessNotes" rows={2} className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Access notes, vendor notes, or entry details." />
              <button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" type="submit">Submit Repair</button>
            </form>
            <div className="mt-5 space-y-3">
              {maintenanceRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-black text-slate-950">{request.subject}</p>
                  <p className="text-sm text-slate-600">{label(request.status)} - {label(request.priority)} - requested by {request.requester.name || request.requester.email}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Important Contacts">
            {searchParams?.contact === "added" ? <p className="mb-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-900">Contact added.</p> : null}
            {staffContacts.length > 0 ? (
              <div className="mb-4 space-y-2">
                {staffContacts.map((contact) => <p key={contact} className="rounded-2xl bg-brand-50 p-3 text-sm font-bold text-brand-950">{contact}</p>)}
              </div>
            ) : null}
            <p className="whitespace-pre-wrap leading-7 text-slate-700">{unit.importantContacts ?? "No important contacts have been saved yet."}</p>
            <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer font-black text-slate-950">Add contact</summary>
              <form action={addLandlordUnitContact} className="mt-4 grid gap-3">
                <input type="hidden" name="unitId" value={unit.id} />
                <input name="name" required className="rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Contact name" />
                <input name="role" className="rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Role or relationship" />
                <input name="email" type="email" className="rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="email@example.com" />
                <input name="phone" className="rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Phone" />
                <textarea name="note" rows={3} className="rounded-2xl border border-slate-300 bg-white px-4 py-3" placeholder="Notes" />
                <button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" type="submit">Add Contact</button>
              </form>
            </details>
          </Panel>

          <Panel title="Assigned Support">
            {searchParams?.staff === "assigned" ? <p className="mb-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-900">Support assignments updated.</p> : null}
            <form action={assignLandlordUnitStaff} className="grid gap-3">
              <input type="hidden" name="unitId" value={unit.id} />
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Property manager</span>
                <select name="propertyManagerUserId" defaultValue={unit.propertyManagerUserId ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3">
                  <option value="">No property manager</option>
                  {propertyManagerOptions.map((staff) => <option key={staff.id} value={staff.id}>{userOptionLabel(staff)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Maintenance contact</span>
                <select name="maintenanceUserId" defaultValue={unit.maintenanceUserId ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3">
                  <option value="">No maintenance contact</option>
                  {maintenanceOptions.map((staff) => <option key={staff.id} value={staff.id}>{userOptionLabel(staff)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Caseworker</span>
                <select name="caseworkerUserId" defaultValue={unit.caseworkerUserId ?? ""} className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3">
                  <option value="">No caseworker</option>
                  {caseworkerOptions.map((staff) => <option key={staff.id} value={staff.id}>{userOptionLabel(staff)}</option>)}
                </select>
              </label>
              <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Save Assignments</button>
            </form>
          </Panel>

          <Panel title="Client Notes">
            <p className="whitespace-pre-wrap leading-7 text-slate-700">{unit.clientNotes ?? "No client notes have been saved yet."}</p>
            <Link href={`/landlord/units/${unit.id}/edit`} className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">Edit Notes</Link>
          </Panel>

          <Panel title="Message Client">
            {primaryApplication ? (
              <form action={sendWorkflowMessage} className="grid gap-3">
                <input type="hidden" name="applicationId" value={primaryApplication.id} />
                <input type="hidden" name="type" value={MessageThreadType.GENERAL} />
                <input name="subject" required defaultValue={`Message about ${unit.property.name} #${unit.unitNumber}`} className="rounded-2xl border border-slate-300 px-4 py-3" />
                <textarea name="body" required rows={5} className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Write a message to the client..." />
                <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800" type="submit">Send Message</button>
                <p className="text-sm leading-6 text-slate-600">Messages are saved to the shared inbox thread for this tenant workflow.</p>
              </form>
            ) : (
              <p className="text-slate-600">Link a current application before messaging a tenant from this unit.</p>
            )}
          </Panel>

          <Panel title="Recent Messages">
            {messageThreads.length === 0 ? (
              <p className="text-slate-600">No messages are connected to this unit yet.</p>
            ) : (
              <div className="space-y-3">
                {messageThreads.map((thread) => (
                  <div key={thread.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-black text-slate-950">{thread.subject}</p>
                    <p className="text-xs font-bold uppercase text-slate-500">{label(thread.status)}</p>
                    {thread.messages[0] ? <p className="mt-2 text-sm text-slate-700">{thread.messages[0].sender.name || thread.messages[0].sender.email}: {thread.messages[0].body}</p> : null}
                  </div>
                ))}
              </div>
            )}
            <Link href="/landlord/inbox" className="mt-4 inline-flex rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">Open Inbox</Link>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

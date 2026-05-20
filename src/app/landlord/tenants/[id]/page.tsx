export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FileText, Inbox, Lock, MessageSquare, ShieldCheck } from "lucide-react";
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

function profileCompleteness(profile: {
  legalName?: string | null;
  phone?: string | null;
  currentAddress?: string | null;
  rentalHistory?: string | null;
  employmentSummary?: string | null;
  applicantSignature?: string | null;
  householdMembers?: unknown[];
  incomeSources?: unknown[];
} | null | undefined) {
  if (!profile) return null;
  const items = [
    profile.legalName,
    profile.phone,
    profile.currentAddress,
    profile.rentalHistory,
    profile.employmentSummary,
    profile.applicantSignature,
    profile.householdMembers?.length ? "household" : null,
    profile.incomeSources?.length ? "income" : null
  ];
  return Math.round((items.filter(Boolean).length / items.length) * 100);
}

type DetailRecord = {
  sourceType: "application" | "occupancy" | "lead";
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string;
  authorized: boolean;
  status: string;
  summary: string | null;
  lastActivity: Date;
  unit: { id: string; unitNumber: string; rentAmount: number; property: { name: string; addressLine: string; city: string; state: string } };
  profile: {
    phone?: string | null;
    currentAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    rentalHistory?: string | null;
    employmentSummary?: string | null;
    landlordReferences?: string | null;
    renterBio?: string | null;
    pets?: string | null;
    accessibilityNeeds?: string | null;
    householdMembers?: Array<{ id: string; name: string; relationship: string; age: number | null }>;
    incomeSources?: Array<{ id: string; sourceName: string; amount: number; frequency: string }>;
  } | null;
  detail: {
    dateOfBirth?: Date | null;
    governmentIdType?: string | null;
    driversLicenseState?: string | null;
    driversLicenseNumber?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;
    currentHousingStartDate?: Date | null;
    previousAddress?: string | null;
    previousLandlordName?: string | null;
    previousLandlordPhone?: string | null;
    reasonForMoving?: string | null;
    requestedMoveInDate?: Date | null;
    voucherProgram?: string | null;
    voucherAgency?: string | null;
    voucherCaseWorker?: string | null;
    voucherCaseWorkerContact?: string | null;
    vehicleInfo?: string | null;
    vehicleMake?: string | null;
    vehicleModel?: string | null;
    vehicleColor?: string | null;
    vehicleYear?: string | null;
    licensePlateNumber?: string | null;
    licensePlateState?: string | null;
    petDetails?: string | null;
    serviceAnimalAccommodation?: string | null;
    hasPriorEviction?: boolean | null;
    priorEvictionExplanation?: string | null;
    hasCriminalHistory?: boolean | null;
    criminalHistoryExplanation?: string | null;
    hasOutstandingUtilities?: boolean | null;
    outstandingUtilitiesExplanation?: string | null;
    signedAt?: Date | null;
  } | null;
  applicationId: string | null;
  leadId: string | null;
  occupancyId: string | null;
  messageThreadId: string | null;
  documents: Array<{ id: string; title: string; status: string; category: string }>;
};

export default async function LandlordTenantDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["LANDLORD"], `/landlord/tenants/${params.id}`);
  const ownerScope = { ownerId: user.userId, isArchived: false };
  const raw = params.id;
  const [sourceType, recordId] = raw.startsWith("application-")
    ? ["application", raw.replace("application-", "")]
    : raw.startsWith("lead-")
      ? ["lead", raw.replace("lead-", "")]
      : raw.startsWith("occupancy-")
        ? ["occupancy", raw.replace("occupancy-", "")]
        : ["occupancy", raw];

  let record: DetailRecord | null = null;

  if (sourceType === "application") {
    const application = await prisma.application.findFirst({
      where: { id: recordId, unit: { property: ownerScope } },
      include: {
        unit: { include: { property: true } },
        applicantUser: { include: { applicantProfile: { include: { householdMembers: true, incomeSources: true } } } },
        applicationDetail: true,
        documents: { orderBy: { createdAt: "desc" } },
        messageThreads: { orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }], take: 1 },
        lead: true
      }
    });
    if (application) {
      const authorized = Boolean(application.applicationDetail?.signedAt || application.applicantUserId);
      record = {
        sourceType: "application",
        name: application.applicantName,
        email: application.applicantEmail,
        phone: application.applicantPhone ?? application.applicantUser?.applicantProfile?.phone ?? null,
        relationship: "Applicant",
        authorized,
        status: application.status,
        summary: application.summary ?? application.lead?.message ?? null,
        lastActivity: application.updatedAt,
        unit: application.unit,
        profile: authorized ? application.applicantUser?.applicantProfile ?? null : null,
        detail: authorized ? application.applicationDetail : null,
        applicationId: application.id,
        leadId: application.leadId,
        occupancyId: null,
        messageThreadId: application.messageThreads[0]?.id ?? null,
        documents: authorized ? application.documents.map((document) => ({ id: document.id, title: document.title, status: document.status, category: document.category })) : []
      };
    }
  }

  if (sourceType === "occupancy") {
    const occupancy = await prisma.occupancy.findFirst({
      where: { id: recordId, unit: { property: ownerScope } },
      include: {
        tenant: { include: { applicantProfile: { include: { householdMembers: true, incomeSources: true } } } },
        unit: { include: { property: true } },
        application: { include: { applicationDetail: true, documents: { orderBy: { createdAt: "desc" } }, messageThreads: { orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }], take: 1 }, lead: true } },
        leasePacket: true
      }
    });
    if (occupancy) {
      record = {
        sourceType: "occupancy",
        name: occupancy.tenant.name ?? occupancy.tenant.email,
        email: occupancy.tenant.email,
        phone: occupancy.tenant.applicantProfile?.phone ?? occupancy.application?.applicantPhone ?? null,
        relationship: ["FORMER", "CANCELLED"].includes(occupancy.status) ? "Past tenant" : "Current tenant",
        authorized: true,
        status: occupancy.status,
        summary: occupancy.notes ?? occupancy.application?.summary ?? null,
        lastActivity: occupancy.updatedAt,
        unit: occupancy.unit,
        profile: occupancy.tenant.applicantProfile,
        detail: occupancy.application?.applicationDetail ?? null,
        applicationId: occupancy.applicationId,
        leadId: occupancy.application?.leadId ?? null,
        occupancyId: occupancy.id,
        messageThreadId: occupancy.application?.messageThreads[0]?.id ?? null,
        documents: occupancy.application?.documents.map((document) => ({ id: document.id, title: document.title, status: document.status, category: document.category })) ?? []
      };
    }
  }

  if (sourceType === "lead") {
    const lead = await prisma.lead.findFirst({
      where: { id: recordId, unit: { property: ownerScope } },
      include: { unit: { include: { property: true } }, application: true }
    });
    if (lead) {
      record = {
        sourceType: "lead",
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        relationship: "Marketplace lead",
        authorized: false,
        status: lead.status,
        summary: lead.message,
        lastActivity: lead.updatedAt,
        unit: lead.unit,
        profile: null,
        detail: null,
        applicationId: lead.application?.id ?? null,
        leadId: lead.id,
        occupancyId: null,
        messageThreadId: null,
        documents: []
      };
    }
  }

  if (!record) notFound();

  const profilePercent = profileCompleteness(record.profile);

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title={record.name} description="Tenant and applicant CRM detail with privacy-aware profile, application, message, unit, and timeline context." actionHref="/landlord/tenants" actionLabel="Back to directory" />

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Contact and relationship</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{record.relationship} connected to {record.unit.property.name} #{record.unit.unitNumber}.</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase ${record.authorized ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                {record.authorized ? <ShieldCheck size={14} /> : <Lock size={14} />}
                {record.authorized ? "Share authorized" : "Limited lead view"}
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Info label="Email" value={record.email ?? "Not provided"} />
              <Info label="Phone" value={record.phone ?? "Not provided"} />
              <Info label="Status" value={label(record.status)} />
              <Info label="Profile completeness" value={profilePercent !== null ? `${profilePercent}%` : "Locked"} />
              <Info label="Last activity" value={record.lastActivity.toLocaleDateString()} />
              <Info label="Desired move-in" value={dateValue(record.detail?.requestedMoveInDate)} />
            </div>
          </div>

          {record.authorized ? (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-black text-slate-950">Application packet</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <Info label="Current address" value={[record.profile?.currentAddress, record.profile?.city, record.profile?.state, record.profile?.zip].filter(Boolean).join(", ") || "Not provided"} />
                  <Info label="Previous address" value={valueOrAsk(record.detail?.previousAddress)} />
                  <Info label="Previous landlord" value={valueOrAsk(record.detail?.previousLandlordName)} />
                  <Info label="Voucher program" value={valueOrAsk(record.detail?.voucherProgram)} />
                  <Info label="Housing agency" value={valueOrAsk(record.detail?.voucherAgency)} />
                  <Info label="Case worker" value={valueOrAsk(record.detail?.voucherCaseWorker)} />
                  <Info label="Case worker contact" value={valueOrAsk(record.detail?.voucherCaseWorkerContact)} />
                  <Info label="Vehicle" value={[record.detail?.vehicleYear, record.detail?.vehicleColor, record.detail?.vehicleMake, record.detail?.vehicleModel].filter(Boolean).join(" ") || "Not provided"} />
                  <Info label="License plate" value={[record.detail?.licensePlateState, record.detail?.licensePlateNumber].filter(Boolean).join(" ") || "Not provided"} />
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <TextBlock label="Summary / latest note" value={record.summary} />
                  <TextBlock label="Rental history" value={record.profile?.rentalHistory} />
                  <TextBlock label="Employment summary" value={record.profile?.employmentSummary} />
                  <TextBlock label="Landlord references" value={record.profile?.landlordReferences} />
                  <TextBlock label="Pets" value={record.detail?.petDetails ?? record.profile?.pets} />
                  <TextBlock label="Accommodation details" value={record.detail?.serviceAnimalAccommodation ?? record.profile?.accessibilityNeeds} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-black text-slate-950">Household and income</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">Household</p>
                    <div className="mt-2 space-y-2 text-sm text-slate-700">{record.profile?.householdMembers?.length ? record.profile.householdMembers.map((member) => <p key={member.id}><strong>{member.name}</strong> - {label(member.relationship)}{member.age !== null ? `, age ${member.age}` : ""}</p>) : <p>None listed.</p>}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">Income</p>
                    <div className="mt-2 space-y-2 text-sm text-slate-700">{record.profile?.incomeSources?.length ? record.profile.incomeSources.map((income) => <p key={income.id}><strong>{income.sourceName}</strong> - {formatCurrency(income.amount)} {label(income.frequency)}</p>) : <p>None listed.</p>}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <Lock className="mx-auto text-slate-400" size={34} />
              <h2 className="mt-3 text-2xl font-black text-slate-950">Reusable profile locked</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                This person has contacted one of your listings, so you can view their lead contact and message. Profile packet details stay locked until they apply or authorize sharing.
              </p>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Documents and activity</h2>
            <div className="mt-5 grid gap-3">
              {record.documents.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{record.authorized ? "No documents are attached to this visible application yet." : "Documents are unavailable until sharing is authorized."}</p>
              ) : record.documents.map((document) => (
                <Link key={document.id} href={`/api/documents/${document.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white">
                  <p className="font-black text-slate-950">{document.title}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-slate-500">{label(document.category)} - {label(document.status)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Linked rental</h2>
            <p className="mt-3 text-lg font-bold text-slate-950">{record.unit.property.name} #{record.unit.unitNumber}</p>
            <p className="text-slate-600">{record.unit.property.addressLine}, {record.unit.property.city}, {record.unit.property.state}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{formatCurrency(record.unit.rentAmount)}</p>
            <Link href={`/landlord/rentals/${record.unit.id}`} className="mt-4 inline-flex w-full justify-center rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:bg-slate-50">Open rental</Link>
          </div>
          <div className="grid gap-3">
            {record.applicationId ? <Action href={`/landlord/applications/${record.applicationId}`} icon={<FileText size={16} />} label="View application" /> : null}
            {record.messageThreadId ? <Action href={`/landlord/inbox?thread=${record.messageThreadId}`} icon={<MessageSquare size={16} />} label="Message" /> : null}
            {record.leadId ? <Action href={`/landlord/leads/${record.leadId}`} icon={<Inbox size={16} />} label="Reply to latest question" /> : null}
            {record.occupancyId ? <Action href={`/landlord/tenants/${record.occupancyId}`} icon={<ShieldCheck size={16} />} label="Occupancy record" /> : null}
          </div>
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

function Action({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700">{icon}{label}</Link>;
}

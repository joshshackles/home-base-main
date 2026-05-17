import Link from "next/link";
import { Activity, Building2, ClipboardList, BellRing, ClipboardCheck, DollarSign, FileSignature, FileText, Home, Inbox, Plus, ServerCog, ShieldCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ledgerTotals } from "@/lib/ledger-queries";
import { APP_VERSION } from "@/lib/app-version";

export default async function AdminPage() {
  const [propertyCount, unitCount, availableCount, userCount, leadCount, applicationCount, documentCount, leaseCount, notificationCount, auditCount, securityEventCount, inspectionCount, ledgerBalance] = await Promise.all([
    prisma.property.count({ where: { isArchived: false } }),
    prisma.unit.count({ where: { NOT: { status: "ARCHIVED" } } }),
    prisma.unit.count({ where: { status: "AVAILABLE", property: { isArchived: false } } }),
    prisma.user.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.application.count({ where: { status: { in: ["STARTED", "SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.document.count(),
    prisma.leasePacket.count(),
    prisma.signatureNotification.count({ where: { status: "QUEUED" } }),
    prisma.auditLog.count(),
    prisma.securityEvent.count(),
    prisma.inspection.count({ where: { status: { in: ["SCHEDULED", "IN_PROGRESS", "NEEDS_REINSPECTION"] } } }),
    ledgerTotals().then((totals) => totals.balance)
  ]);

  const cards = [
    { label: "Properties", value: propertyCount, icon: Building2, href: "/admin/properties" },
    { label: "Units", value: unitCount, icon: Home, href: "/admin/units" },
    { label: "Available", value: availableCount, icon: Plus, href: "/marketplace" },
    { label: "New Leads", value: leadCount, icon: Inbox, href: "/admin/leads" },
    { label: "Applications", value: applicationCount, icon: ClipboardList, href: "/admin/applications" },
    { label: "Inspections", value: inspectionCount, icon: ClipboardCheck, href: "/admin/inspections" },
    { label: "Ledger", value: `$${ledgerBalance.toLocaleString()}`, icon: DollarSign, href: "/admin/ledger" },
    { label: "Documents", value: documentCount, icon: FileText, href: "/admin/documents" },
    { label: "Leases", value: leaseCount, icon: FileSignature, href: "/admin/leases" },
    { label: "Notices", value: notificationCount, icon: BellRing, href: "/admin/notifications" },
    { label: "Users", value: userCount, icon: Users, href: "/admin/users" },
    { label: "Audit", value: auditCount, icon: Activity, href: "/admin/audit" },
    { label: "System", value: APP_VERSION, icon: ServerCog, href: "/admin/system" },
    { label: "Security", value: securityEventCount, icon: ShieldCheck, href: "/admin/security/events" }
  ];

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Admin</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">HomeBase MLS Dashboard</h1>
          <p className="mt-2 text-slate-600">Manage marketplace inventory, review leads, and track application starts.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/leads" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center font-bold text-slate-900 shadow-sm hover:bg-slate-50">
            View Leads
          </Link>
          <Link href="/admin/properties" className="rounded-2xl bg-brand-600 px-5 py-3 text-center font-bold text-white shadow-sm hover:bg-brand-700">
            Manage Properties
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon size={22} />
              </span>
              <p className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-1 text-4xl font-black text-slate-950">{card.value}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">Current build focus</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          This release combines production hardening, object storage, PDF/e-signature evidence, automated verification, accessibility, SEO, and legal-page readiness with the existing housing workflow foundation.
        </p>
      </section>
    </main>
  );
}

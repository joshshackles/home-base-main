import Link from "next/link";
import { Building2, ClipboardList, Home, Inbox, Plus, MessageSquare, Wrench } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LandlordDashboardPage() {
  const user = await requireRole(["LANDLORD"], "/landlord");

  const scope = { property: { ownerId: user.userId, isArchived: false } };
  const [propertyCount, unitCount, availableCount, leadCount, applicationCount, maintenanceCount, inboxCount] = await Promise.all([
    prisma.property.count({ where: { ownerId: user.userId, isArchived: false } }),
    prisma.unit.count({ where: { ...scope, NOT: { status: "ARCHIVED" } } }),
    prisma.unit.count({ where: { ...scope, status: "AVAILABLE" } }),
    prisma.lead.count({ where: { unit: scope } }),
    prisma.application.count({ where: { unit: scope, status: { in: ["STARTED", "SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.maintenanceRequest.count({ where: { unit: scope, status: { in: ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] } } }),
    prisma.messageThread.count({ where: { OR: [{ maintenanceRequest: { unit: scope } }, { application: { unit: scope } }] } })
  ]);

  const cards = [
    { label: "Properties", value: propertyCount, icon: Building2, href: "/landlord/properties" },
    { label: "Units", value: unitCount, icon: Home, href: "/landlord/units" },
    { label: "Available", value: availableCount, icon: Plus, href: "/landlord/units" },
    { label: "Leads", value: leadCount, icon: Inbox, href: "/landlord/leads" },
    { label: "Active Applications", value: applicationCount, icon: ClipboardList, href: "/landlord/applications" },
    { label: "Maintenance", value: maintenanceCount, icon: Wrench, href: "/landlord/maintenance" },
    { label: "Inbox", value: inboxCount, icon: MessageSquare, href: "/landlord/inbox" }
  ];

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Landlord Portal</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">Welcome{user.name ? `, ${user.name}` : ""}</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">View assigned properties, maintain unit listing details, and track leads and applications tied to your units.</p>
        </div>
        <Link href="/landlord/units" className="rounded-2xl bg-brand-600 px-5 py-3 text-center font-bold text-white shadow-sm hover:bg-brand-700">Manage Units</Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon size={22} /></span>
              <p className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-1 text-4xl font-black text-slate-950">{card.value}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">v0.7.0 landlord access</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">This portal is scoped to properties assigned to your landlord account. You can update unit listing details and add notes to leads and applications, but admin-only actions such as ownership changes, user management, archiving, and record deletion stay protected.</p>
      </section>
    </main>
  );
}

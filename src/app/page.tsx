import Link from "next/link";
import { ArrowRight, Building2, ClipboardCheck, FileSignature, Search } from "lucide-react";

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <p className="mb-4 inline-flex w-fit rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
              Rental marketplace plus housing workflow tools
            </p>
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
              Manage properties, units, applications, inspections, and leases in one clean system.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Browse rental units and manage leads, applications, inspections, documents, lease packets, e-signature evidence, and ledger records with production-focused security hardening.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-brand-700">
                Browse Marketplace <ArrowRight size={18} />
              </Link>
              <Link href="/admin" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">
                Open Admin
              </Link>
              <Link href="/landlord" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">
                Landlord Portal
              </Link>
              <Link href="/applicant" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">
                Applicant Portal
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-xl">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Dashboard preview</p>
                  <h2 className="text-2xl font-black text-slate-950">Joplin Rental Units</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">Live</span>
              </div>
              <div className="grid gap-3">
                {[
                  ["Available Units", "18", Building2],
                  ["Pending Applications", "7", ClipboardCheck],
                  ["Lease Packets", "4", FileSignature],
                  ["Marketplace Searches", "126", Search]
                ].map(([label, value, Icon]) => {
                  const LucideIcon = Icon as typeof Building2;
                  return (
                    <div key={label as string} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                          <LucideIcon size={20} />
                        </span>
                        <p className="font-bold text-slate-800">{label as string}</p>
                      </div>
                      <p className="text-2xl font-black text-slate-950">{value as string}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

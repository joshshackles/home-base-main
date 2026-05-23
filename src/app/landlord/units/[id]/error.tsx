"use client";

import Link from "next/link";

export default function UnitWorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-[900px] px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-rose-700">Workspace error</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">The unit workspace could not load.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Try loading the workspace again. If the problem continues, return to Inventory and reopen the unit from an authorized property row.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">Try again</button>
          <Link href="/landlord/inventory" className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50">Back to Inventory</Link>
        </div>
      </section>
    </main>
  );
}

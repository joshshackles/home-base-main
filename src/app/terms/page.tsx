import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Use HomeBase MLS only for lawful property, rental, application, document, inspection, lease, and ledger workflows.",
};

export default function Page() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.25em] text-brand-700">HomeBase MLS</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Terms of Service</h1>
      <section className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 leading-7 text-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-950">Platform use</h2>
          <p className="mt-2">Use HomeBase MLS only for lawful property, rental, application, document, inspection, lease, and ledger workflows.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">No legal advice</h2>
          <p className="mt-2">The platform helps organize records but does not replace legal, accounting, fair-housing, or compliance advice.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Production review</h2>
          <p className="mt-2">Review these terms with counsel before public launch.</p>
        </div>
      </section>
    </main>
  );
}

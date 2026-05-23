import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using HomeBase MLS rental marketplace, account, application, document, leasing, payment, and property management tools.",
};

export default function Page() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.25em] text-brand-700">HomeBase MLS</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Terms of Service</h1>
      <section className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 leading-7 text-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-950">Platform use</h2>
          <p className="mt-2">Use HomeBase MLS only for lawful rental search, listing, application, document, inspection, lease, payment, maintenance, messaging, and property management workflows.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">No legal advice</h2>
          <p className="mt-2">HomeBase MLS helps organize housing records and workflows. It does not replace legal, accounting, tax, fair-housing, screening, payment, or compliance advice from qualified professionals.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">User responsibility</h2>
          <p className="mt-2">Users are responsible for the accuracy of information they submit and for following applicable laws, lease terms, program rules, payment requirements, and account permissions.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Service availability</h2>
          <p className="mt-2">Some features depend on configured providers for payments, messaging, screening, documents, maps, or integrations. Availability may vary by organization and account role.</p>
        </div>
      </section>
    </main>
  );
}

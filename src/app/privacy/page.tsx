import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How HomeBase MLS handles account, rental, application, document, message, payment, and housing workflow information.",
};

export default function Page() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.25em] text-brand-700">HomeBase MLS</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Privacy Policy</h1>
      <section className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 leading-7 text-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-950">What we collect</h2>
          <p className="mt-2">HomeBase MLS collects the information needed to help people search for rentals, submit inquiries and applications, manage housing workflows, upload documents, exchange messages, complete lease tasks, and operate tenant or landlord accounts.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">How we use it</h2>
          <p className="mt-2">We use this information to provide the marketplace and account tools, route messages and requests, protect accounts, prevent abuse, maintain records, and support property, lease, payment, maintenance, inspection, and document workflows.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Retention</h2>
          <p className="mt-2">Some records may be retained when needed for housing operations, lease history, accounting, security, audit, legal, or dispute-resolution purposes.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Your choices</h2>
          <p className="mt-2">Account holders can review and update profile details in their portal. Requests about account information should be sent through the account administrator or support contact for the organization operating HomeBase MLS.</p>
        </div>
      </section>
    </main>
  );
}

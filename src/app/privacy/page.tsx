import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Account, application, document, inspection, lease, signature, ledger, audit, and security-event records needed to operate the housing workflow.",
};

export default function Page() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.25em] text-brand-700">HomeBase MLS</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Privacy Policy</h1>
      <section className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 leading-7 text-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-950">What we collect</h2>
          <p className="mt-2">Account, application, document, inspection, lease, signature, ledger, audit, and security-event records needed to operate the housing workflow.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">How we use it</h2>
          <p className="mt-2">To provide marketplace and housing workflow services, protect accounts, prevent abuse, preserve evidence, and support compliance.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Retention</h2>
          <p className="mt-2">Some records may be retained to satisfy housing, lease, accounting, security, or dispute-resolution requirements.</p>
        </div>
      </section>
    </main>
  );
}

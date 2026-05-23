import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fair Housing Notice",
  description: "HomeBase MLS supports equal housing opportunity and consistent, criteria-based rental workflows.",
};

export default function Page() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.25em] text-brand-700">HomeBase MLS</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Fair Housing Notice</h1>
      <section className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 leading-7 text-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-950">Equal housing opportunity</h2>
          <p className="mt-2">HomeBase MLS supports equal housing opportunity and consistent rental workflows. Listings, inquiries, applications, messages, screenings, and decisions should be handled using lawful, neutral criteria.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Operator responsibility</h2>
          <p className="mt-2">Property owners, managers, and administrators are responsible for complying with all applicable fair-housing laws and local requirements.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Recommended practice</h2>
          <p className="mt-2">Document neutral rental criteria, keep communication professional, avoid discriminatory language, and preserve complete application and audit records.</p>
        </div>
      </section>
    </main>
  );
}

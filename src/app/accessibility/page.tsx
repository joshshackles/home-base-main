import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description: "HomeBase MLS aims to provide accessible rental marketplace and housing workflow pages.",
};

export default function Page() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.25em] text-brand-700">HomeBase MLS</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Accessibility Statement</h1>
      <section className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 leading-7 text-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-950">Commitment</h2>
          <p className="mt-2">HomeBase MLS aims to provide accessible rental marketplace and housing workflow pages.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Current improvements</h2>
          <p className="mt-2">This build adds a skip-to-content link, legal/accessibility footer links, clearer metadata, and verification coverage.</p>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Feedback</h2>
          <p className="mt-2">Report accessibility barriers to the site administrator so pages, forms, and workflows can be improved.</p>
        </div>
      </section>
    </main>
  );
}

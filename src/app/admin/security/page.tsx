import { ShieldCheck, TriangleAlert, CheckCircle2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireCapability } from "@/lib/role-capabilities.server";

const completed = [
  "Admin server actions call the same server-side role check as the admin layout.",
  "Property, unit, lead, and login payloads are validated with shared Zod schemas.",
  "Public inquiry failures now return a visible message instead of a generic error page.",
  "Hard-delete buttons were removed from inventory tables; archive and restore are the safe defaults.",
  "Login attempts have a lightweight local rate-limit guard for development and early testing.",
  "Inactive users are blocked from logging in.",
  "The final active admin account cannot be deactivated or demoted.",
  "Landlord routes and actions check ownership before showing or modifying assigned records.",
  "Document download routes enforce role, ownership, and visibility rules before serving files.",
  "Audit logging now records major admin actions, authentication events, document events, and workflow changes.",
  "A system status page and preflight script were added for deployment checks.",
  "v2.0.0 adds rent/payment ledger tracking. Review who can enter charges, void entries, and see balances before production use."
];

const remaining = [
  "Consider replacing local username/password authentication with Clerk, Auth.js, or Supabase Auth if this becomes a public SaaS product.",
  "Move the in-memory rate-limit fallback to Redis or another persistent store before deploying on serverless infrastructure."
];

export default async function SecurityPage() {
  await requireCapability("super-admin.security", "/admin/security");

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="System"
        title="Security Checklist"
        description="Track the current safety status of the application before new workflow features are added."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={24} />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Completed</p>
              <h2 className="text-2xl font-black text-slate-950">Hardening items</h2>
            </div>
          </div>
          <ul className="mt-6 space-y-4">
            {completed.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <TriangleAlert size={24} />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Still required</p>
              <h2 className="text-2xl font-black text-slate-950">Before production</h2>
            </div>
          </div>
          <ul className="mt-6 space-y-4">
            {remaining.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                <TriangleAlert className="mt-0.5 shrink-0 text-amber-600" size={18} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <a href="/admin/security/events" className="font-bold text-brand-700 hover:text-brand-900">View security events →</a>
      </div>
    </main>
  );
}

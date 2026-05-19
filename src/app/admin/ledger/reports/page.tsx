import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

const reports = [
  {
    title: "Full ledger CSV",
    description: "Export all charges, payments, credits, adjustments, status fields, accounts, units, and signed accounting amounts.",
    href: "/admin/ledger/export",
    label: "Download CSV"
  },
  {
    title: "Balance aging CSV",
    description: "Export open balances grouped by account with oldest charge and aging bucket for reconciliation or board reporting.",
    href: "/admin/ledger/aging/export",
    label: "Download CSV"
  },
  {
    title: "Printable statements",
    description: "Open tenant/applicant statements that can be printed or saved as PDF from the browser.",
    href: "/admin/ledger/statements",
    label: "Open Statements"
  },
  {
    title: "Payment plans",
    description: "Review active, completed, defaulted, and cancelled payment plans before external reconciliation.",
    href: "/admin/ledger/plans",
    label: "Open Plans"
  }
];

export default function LedgerReportsPage() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader title="Ledger Reports & Exports" description="Download reconciliation-ready CSV reports and open printable account statements." />
      <div className="mb-6 flex flex-wrap gap-3">
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger">Ledger</Link>
        <Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" href="/admin/ledger/aging">Aging Report</Link>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <div key={report.href} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">{report.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{report.description}</p>
            <Link className="mt-5 inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700" href={report.href}>{report.label}</Link>
          </div>
        ))}
      </section>
      <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
        <h2 className="text-lg font-black">Reconciliation note</h2>
        <p className="mt-2">Exports use cents from the database and render decimal dollar amounts in CSV files. Payments and credits are also included as signed negative amounts so spreadsheets can sum balances cleanly.</p>
      </section>
    </main>
  );
}

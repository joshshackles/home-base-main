import Link from "next/link";

export default function NotAuthorizedPage() {
  return (
    <main id="main-content" className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl items-center px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Access denied</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">You do not have access to this area.</h1>
        <p className="mt-3 leading-7 text-slate-600">
          This section is limited to authorized HomeBase MLS users. Contact an administrator if your account should have dashboard access.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">
          Return Home
        </Link>
      </div>
    </main>
  );
}

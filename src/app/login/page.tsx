import { loginAction } from "./actions";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";

export default function LoginPage({ searchParams }: { searchParams?: { error?: string; message?: string; next?: string } }) {
  const next = searchParams?.next || "/applicant";
  const error = searchParams?.error;

  return (
    <main id="main-content" className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Login</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Sign in to HomeBase MLS</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Everyone starts with the applicant dashboard. Approved access adds landlord, staff, inspection, maintenance, or admin modules to the same workbench.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
        {searchParams?.message ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {searchParams.message}
          </div>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Email</span>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              name="email"
              type="email"
              placeholder="admin@homebase.local"
              autoComplete="email"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Password</span>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              name="password"
              type="password"
              placeholder="Use the temporary seed password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">
            Sign In
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">
          <a href="/forgot-password" className="text-brand-700 hover:text-brand-900">Forgot password?</a>
          <a href={`/signup?next=${encodeURIComponent(next)}`} className="text-brand-700 hover:text-brand-900">Create applicant account</a>
        </div>

        <section className="mt-6 rounded-3xl border border-brand-100 bg-brand-50/60 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Demo accounts</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Use one click to sign in with seeded test accounts. All demo accounts use <strong className="text-slate-900">{DEMO_PASSWORD}</strong>.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => (
              <form key={account.email} action={loginAction}>
                <input type="hidden" name="email" value={account.email} />
                <input type="hidden" name="password" value={DEMO_PASSWORD} />
                <input type="hidden" name="next" value={account.next} />
                <button className="w-full rounded-2xl border border-brand-200 bg-white px-4 py-3 text-left font-bold text-slate-900 shadow-sm transition hover:border-brand-400 hover:bg-brand-50" type="submit">
                  Login as {account.label}
                  <span className="mt-1 block text-xs font-semibold text-slate-500">{account.email}</span>
                </button>
              </form>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

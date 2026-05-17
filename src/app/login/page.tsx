import { loginAction } from "./actions";

export default function LoginPage({ searchParams }: { searchParams?: { error?: string; message?: string; next?: string } }) {
  const next = searchParams?.next || "/admin";
  const error = searchParams?.error;

  return (
    <main id="main-content" className="mx-auto flex min-h-[calc(100vh-65px)] max-w-md items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Login</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Sign in to HomeBase MLS</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Dashboard access is protected. Administrators use the admin area, landlords are sent to their assigned property portal, and applicants are sent to their application dashboard.
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

        <a href="/forgot-password" className="mt-4 inline-block text-sm font-bold text-brand-700 hover:text-brand-900">Forgot password?</a>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <strong className="text-slate-900">Seed logins:</strong> admin@homebase.local, landlord@homebase.local, and applicant@homebase.local are created with generated temporary passwords. Check the seed command output or set SEED_ADMIN_PASSWORD, SEED_LANDLORD_PASSWORD, and SEED_APPLICANT_PASSWORD before running the seed.
        </div>
      </div>
    </main>
  );
}

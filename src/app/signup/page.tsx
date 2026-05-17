import Link from "next/link";
import { applicantSignupAction } from "./actions";
import { passwordPolicyMessage } from "@/lib/password";

export default function ApplicantSignupPage({ searchParams }: { searchParams?: { error?: string; next?: string } }) {
  const next = searchParams?.next || "/applicant";

  return (
    <main id="main-content" className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Applicant signup</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Create your applicant portal account</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Use the same email you used on your housing inquiry. HomeBase will automatically connect matching applications to your new account.
        </p>

        {searchParams?.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{searchParams.error}</div>
        ) : null}

        <form action={applicantSignupAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="next" value={next} />
          <label className="block md:col-span-2">
            <span className="text-sm font-bold text-slate-700">Legal name</span>
            <input name="name" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="name" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Email</span>
            <input name="email" type="email" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="email" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Phone</span>
            <input name="phone" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="tel" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Password</span>
            <input name="password" type="password" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="new-password" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Confirm password</span>
            <input name="confirmPassword" type="password" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="new-password" />
          </label>
          <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 md:col-span-2">{passwordPolicyMessage()}</p>
          <button className="rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700 md:col-span-2">Create Account</button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-brand-700 hover:text-brand-900">Sign in</Link>.
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { requestPasswordResetAction } from "@/app/reset-password/actions";

export default function ForgotPasswordPage({ searchParams }: { searchParams?: { error?: string; sent?: string } }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-md items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Account Recovery</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Reset your password</h1>
        <p className="mt-3 leading-7 text-slate-600">Enter your email address. HomeBase MLS will send a reset link using the configured email provider. In local development, the console provider prints the message to the server console.</p>
        {searchParams?.error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{searchParams.error}</div> : null}
        {searchParams?.sent ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">If that account exists, a reset link has been created.</div> : null}
        <form action={requestPasswordResetAction} className="mt-6 space-y-4">
          <label className="block"><span className="text-sm font-bold text-slate-700">Email</span><input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" name="email" type="email" autoComplete="email" required /></label>
          <button className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Create Reset Link</button>
        </form>
        <Link href="/login" className="mt-5 inline-block text-sm font-bold text-brand-700 hover:text-brand-900">Back to login</Link>
      </div>
    </main>
  );
}

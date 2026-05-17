import { resetPasswordAction } from "@/app/reset-password/actions";

export default function ResetPasswordPage({ searchParams }: { searchParams?: { token?: string; error?: string } }) {
  const token = searchParams?.token || "";
  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-md items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Account Recovery</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Choose a new password</h1>
        <p className="mt-3 leading-7 text-slate-600">Reset links expire after 45 minutes and can be used only once.</p>
        {searchParams?.error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{searchParams.error}</div> : null}
        <form action={resetPasswordAction} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <label className="block"><span className="text-sm font-bold text-slate-700">New password</span><input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Confirm new password</span><input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required /></label>
          <button className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Reset Password</button>
        </form>
      </div>
    </main>
  );
}

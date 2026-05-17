import { MIN_PASSWORD_LENGTH, passwordPolicyMessage } from "@/lib/password";
import { changePasswordAction } from "@/app/account/actions";
import { requireUser } from "@/lib/auth";

export default async function PasswordPage({ searchParams }: { searchParams?: { error?: string; success?: string; reason?: string } }) {
  const user = await requireUser("/account/password");
  const required = searchParams?.reason === "required";

  return (
    <main id="main-content" className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Account Security</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Change Password</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Signed in as <strong>{user.email}</strong>. Use a strong password you do not reuse anywhere else. {passwordPolicyMessage()}
        </p>

        {required ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">An administrator marked this account for a required password change before continuing.</div> : null}
        {searchParams?.error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{searchParams.error}</div> : null}
        {searchParams?.success ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{searchParams.success}</div> : null}

        <form action={changePasswordAction} className="mt-6 space-y-4">
          <label className="block"><span className="text-sm font-bold text-slate-700">Current password</span><input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" name="currentPassword" type="password" autoComplete="current-password" required /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">New password</span><input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" name="newPassword" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required /></label>
          <label className="block"><span className="text-sm font-bold text-slate-700">Confirm new password</span><input className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" name="confirmPassword" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required /></label>
          <button className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">Update Password</button>
        </form>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UserForm } from "@/components/admin/UserForm";
import { createPasswordResetLink } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { emailProvider } from "@/lib/email";

export default async function EditUserPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { resetEmail?: string; provider?: string; error?: string; resetLink?: string };
}) {
  const { id } = params;
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) notFound();

  const provider = emailProvider();

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Edit User"
        description="Update account details, role, active status, password reset emails, and required password-change controls."
      />

      {searchParams?.resetEmail === "sent" ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
          <p className="font-black">Password reset email sent</p>
          <p className="mt-2">A reset link was generated and sent through the configured provider: <span className="font-bold">{searchParams.provider ?? provider}</span>.</p>
        </div>
      ) : null}

      {searchParams?.resetEmail === "failed" ? (
        <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-black">Password reset link created, but email delivery failed</p>
          <p className="mt-2">Provider: <span className="font-bold">{searchParams.provider ?? provider}</span></p>
          {searchParams.error ? <p className="mt-2 break-words">Error: {searchParams.error}</p> : null}
          <p className="mt-2">Check the email provider configuration, then use the button below to generate and send a fresh reset link.</p>
        </div>
      ) : null}

      {searchParams?.resetLink ? (
        <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-black">Legacy reset link was generated</p>
          <p className="mt-2 break-all rounded-2xl bg-white p-3 font-mono text-xs text-amber-950">{searchParams.resetLink}</p>
          <p className="mt-2">This manual link display is retained for backwards compatibility. New reset actions email the link instead.</p>
        </div>
      ) : null}

      <UserForm user={user} />

      <form action={createPasswordResetLink} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="userId" value={user.id} />
        <h2 className="text-xl font-black text-slate-950">Password Recovery</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Generate a one-time password reset link and send it to this user through the configured email provider. The link expires after 45 minutes.</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">Current email provider: {provider}</p>
        <button className="mt-4 rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">Email Password Reset Link</button>
      </form>
    </main>
  );
}

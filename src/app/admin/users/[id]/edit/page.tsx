import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UserForm } from "@/components/admin/UserForm";
import { createPasswordResetLink } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";

export default async function EditUserPage({ params, searchParams }: { params: { id: string }; searchParams?: { resetLink?: string } }) {
  const { id } = params;
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Edit User"
        description="Update account details, role, active status, password reset links, and required password-change controls."
      />

      {searchParams?.resetLink ? (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
          <p className="font-black">Password reset link created</p>
          <p className="mt-2 break-all rounded-2xl bg-white p-3 font-mono text-xs text-emerald-950">{searchParams.resetLink}</p>
          <p className="mt-2 text-emerald-800">This link expires in 45 minutes. In production, this should be emailed instead of copied manually.</p>
        </div>
      ) : null}

      <UserForm user={user} />

      <form action={createPasswordResetLink} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="userId" value={user.id} />
        <h2 className="text-xl font-black text-slate-950">Password Recovery</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Create a one-time password reset link for this user. The link is shown once on this page and expires after 45 minutes.</p>
        <button className="mt-4 rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">Create Password Reset Link</button>
      </form>
    </main>
  );
}

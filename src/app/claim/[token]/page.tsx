export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { getVerifiedCurrentUser } from "@/lib/auth";
import { passwordPolicyMessage } from "@/lib/password";
import { claimApplicationAction } from "./actions";

export default async function ClaimApplicationPage({ params, searchParams }: { params: { token: string }; searchParams?: { error?: string } }) {
  const claim = await prisma.applicationClaimToken.findUnique({
    where: { tokenHash: hashToken(params.token) },
    include: { application: { include: { unit: { include: { property: true } } } } }
  });

  if (!claim) notFound();
  const user = await getVerifiedCurrentUser();
  const isExpired = claim.expiresAt < new Date();
  const isClaimed = Boolean(claim.claimedAt);
  const needsPassword = !user && !(await prisma.user.findUnique({ where: { email: claim.email }, select: { id: true } }));

  return (
    <main id="main-content" className="mx-auto flex min-h-[calc(100vh-65px)] max-w-2xl items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="font-bold uppercase tracking-[0.25em] text-brand-700">Claim application</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Connect this application to your portal</h1>
        <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-slate-700">
          <p className="font-black text-slate-950">{claim.application.unit.property.name} #{claim.application.unit.unitNumber}</p>
          <p className="mt-1">{claim.application.unit.property.addressLine}, {claim.application.unit.property.city}, {claim.application.unit.property.state}</p>
          <p className="mt-3 text-sm"><strong>Applicant email:</strong> {claim.email}</p>
          <p className="mt-1 text-sm"><strong>Expires:</strong> {claim.expiresAt.toLocaleString()}</p>
        </div>

        {searchParams?.error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{searchParams.error}</div> : null}
        {isExpired || isClaimed ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            This claim link is {isClaimed ? "already used" : "expired"}. Ask the property team to send a fresh claim link.
          </div>
        ) : (
          <form action={claimApplicationAction} className="mt-6 space-y-4">
            <input type="hidden" name="token" value={params.token} />
            {user ? (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">You are signed in as {user.email}. This application must match that email address.</div>
            ) : needsPassword ? (
              <>
                <p className="text-sm leading-6 text-slate-600">No applicant account exists for this email yet. Create a password to claim the application and open your applicant portal.</p>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Password</span>
                  <input name="password" type="password" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="new-password" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Confirm password</span>
                  <input name="confirmPassword" type="password" required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" autoComplete="new-password" />
                </label>
                <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{passwordPolicyMessage()}</p>
              </>
            ) : (
              <p className="rounded-2xl bg-brand-50 p-4 text-sm font-semibold text-brand-900">An account exists for this email. Sign in first, then return to this link to claim the application.</p>
            )}
            <button className="w-full rounded-2xl bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700" disabled={!user && !needsPassword}>Claim Application</button>
          </form>
        )}

        {!user && !needsPassword ? <Link href={`/login?next=/claim/${encodeURIComponent(params.token)}`} className="mt-5 inline-flex w-full justify-center rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-900 hover:bg-slate-50">Sign In To Claim</Link> : null}
      </div>
    </main>
  );
}

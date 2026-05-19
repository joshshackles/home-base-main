import Link from "next/link";
import { Building2, FileText, Home, KeyRound, LayoutDashboard, LogIn, LogOut, Search } from "lucide-react";
import type { getVerifiedCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { HomeBaseLogo } from "@/components/brand/HomeBaseLogo";

type VerifiedUser = Awaited<ReturnType<typeof getVerifiedCurrentUser>>;

export function AppHeader({ user }: { user: VerifiedUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <HomeBaseLogo tone="light" />
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-bold text-slate-300">
          <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/10 hover:text-white" href="/marketplace">
            <Search size={16} /> Marketplace
          </Link>
          {user ? (
            <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/10 hover:text-white" href="/applicant">
              <LayoutDashboard size={16} /> Dashboard
            </Link>
          ) : null}
          {user?.role === "ADMIN" ? (
            <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/10 hover:text-white" href="/admin">
              <Building2 size={16} /> Admin
            </Link>
          ) : null}
          {user?.role === "LANDLORD" ? (
            <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/10 hover:text-white" href="/landlord">
              <Home size={16} /> Landlord
            </Link>
          ) : null}
          {user?.role === "APPLICANT" || user?.role === "TENANT" ? (
            <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/10 hover:text-white" href="/applicant/applications">
              <FileText size={16} /> Applications
            </Link>
          ) : null}
          {user ? (
            <>
              <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/10 hover:text-white" href="/account/password">
                <KeyRound size={16} /> Account
              </Link>
            <form action={logoutAction}>
              <button className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/10 hover:text-white" type="submit">
                <LogOut size={16} /> Logout
              </button>
            </form>
            </>
          ) : (
            <>
              <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/10 hover:text-white" href="/signup">
                <FileText size={16} /> Apply
              </Link>
              <Link className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-white hover:bg-blue-700" href="/login">
                <LogIn size={16} /> Login
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

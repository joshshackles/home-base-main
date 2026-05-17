import Link from "next/link";
import { Building2, FileText, Home, KeyRound, LayoutDashboard, LogIn, LogOut, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";

export async function AppHeader() {
  const user = getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-950">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Building2 size={20} />
          </span>
          <span>HomeBase MLS</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-medium text-slate-700">
          <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100" href="/marketplace">
            <Search size={16} /> Marketplace
          </Link>
          {user?.role === "ADMIN" ? (
            <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100" href="/admin">
              <LayoutDashboard size={16} /> Admin
            </Link>
          ) : null}
          {user?.role === "LANDLORD" ? (
            <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100" href="/landlord">
              <Home size={16} /> Landlord
            </Link>
          ) : null}
          {user?.role === "APPLICANT" || user?.role === "TENANT" ? (
            <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100" href="/applicant">
              <FileText size={16} /> Applicant
            </Link>
          ) : null}
          {user ? (
            <>
              <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100" href="/account/password">
                <KeyRound size={16} /> Account
              </Link>
            <form action={logoutAction}>
              <button className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100" type="submit">
                <LogOut size={16} /> Logout
              </button>
            </form>
            </>
          ) : (
            <Link className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100" href="/login">
              <LogIn size={16} /> Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

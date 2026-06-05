import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, Menu } from "lucide-react";
import type { getVerifiedCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { HomeBaseLogo } from "@/components/brand/HomeBaseLogo";

type VerifiedUser = Awaited<ReturnType<typeof getVerifiedCurrentUser>>;

export function AppHeader({ user }: { user: VerifiedUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 text-slate-950 shadow-sm shadow-slate-950/[0.03] backdrop-blur">
      <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2 font-bold" aria-label="HomeBase MLS homepage">
          <HomeBaseLogo tone="dark" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-bold text-slate-900 lg:flex">
          <Link className="inline-flex items-center gap-1 hover:text-blue-700" href="/marketplace">Rent <ChevronDown size={14} /></Link>
          <Link className="hover:text-blue-700" href="/#how-it-works">How It Works</Link>
          <Link className="hover:text-blue-700" href="/marketplace">Find a Property</Link>
          <Link className="inline-flex items-center gap-1 hover:text-blue-700" href="/#resources">Resources <ChevronDown size={14} /></Link>
          <Link className="hover:text-blue-700" href="/#about">About Us</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link href="/workspace" className="hidden items-center gap-2 rounded-md px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-100 sm:inline-flex">
                <LayoutDashboard size={16} /> Workspace
              </Link>
              <form action={logoutAction}>
                <button className="rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800" type="submit">
                  <span className="hidden sm:inline">Log Out</span>
                  <LogOut className="sm:hidden" size={16} />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="hidden rounded-md px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-100 sm:inline-flex" href="/login">Log In</Link>
              <Link className="rounded-md bg-[#061c3f] px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-900" href="/signup">Sign Up</Link>
            </>
          )}
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-950 hover:bg-slate-100" aria-label="Open menu">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}

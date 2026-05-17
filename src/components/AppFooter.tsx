import Link from "next/link";
import { APP_RELEASE_LABEL } from "@/lib/app-version";

const links = [
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Fair Housing", "/fair-housing"],
  ["Accessibility", "/accessibility"],
];

export function AppFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="font-semibold">{APP_RELEASE_LABEL}</p>
        <nav aria-label="Legal and compliance links" className="flex flex-wrap gap-4">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="font-bold text-slate-700 hover:text-brand-700">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

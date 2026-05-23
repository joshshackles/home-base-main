import Link from "next/link";

export const unitWorkspaceTabs = [
  { key: "listing", label: "Listing" },
  { key: "leads-applications", label: "Leads & Applications" },
  { key: "tenant", label: "Tenant" },
  { key: "lease", label: "Lease" },
  { key: "ledger", label: "Ledger" },
  { key: "maintenance", label: "Maintenance" },
  { key: "inspections", label: "Inspections" },
  { key: "documents", label: "Documents" },
  { key: "timeline", label: "Timeline" },
  { key: "staff-contacts", label: "Staff & Contacts" }
] as const;

export type UnitWorkspaceTabKey = (typeof unitWorkspaceTabs)[number]["key"];

export function normalizeUnitWorkspaceTab(value: string | undefined): UnitWorkspaceTabKey {
  return unitWorkspaceTabs.some((tab) => tab.key === value) ? (value as UnitWorkspaceTabKey) : "listing";
}

export function UnitWorkspaceTabs({ unitId, activeTab }: { unitId: string; activeTab: UnitWorkspaceTabKey }) {
  return (
    <nav aria-label="Unit workspace sections" className="sticky top-[73px] z-20 mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
      {unitWorkspaceTabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={`/landlord/units/${unitId}?tab=${tab.key}`}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition ${
              active ? "bg-slate-950 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export type PlatformDomainLayer = "query" | "command" | "policy" | "audit" | "status";

export type PlatformDomainRegistration = {
  key: string;
  label: string;
  purpose: string;
  layers: PlatformDomainLayer[];
  primaryConsumers: string[];
};

export const platformDomainRegistry = [
  {
    key: "applications",
    label: "Applications",
    purpose: "Landlord review read models, application workflow summaries, fairness-safe decision context, and lease handoff state.",
    layers: ["query"],
    primaryConsumers: ["landlord web", "future mobile", "future public API"]
  },
  {
    key: "documents",
    label: "Documents",
    purpose: "Scoped document center models, lease packet summaries, upload selectors, and signature queue context.",
    layers: ["query"],
    primaryConsumers: ["landlord web", "tenant/applicant portals", "future API"]
  },
  {
    key: "leads",
    label: "Leads",
    purpose: "Leasing pipeline stages, lead search, conversion metrics, and prospect queue read models.",
    layers: ["query", "status"],
    primaryConsumers: ["landlord web", "leasing agent shell", "future mobile"]
  },
  {
    key: "ledger",
    label: "Ledger",
    purpose: "Scoped ledger entries, payment plans, and balance snapshots for financial surfaces.",
    layers: ["query", "policy"],
    primaryConsumers: ["landlord web", "tenant portal", "reports"]
  },
  {
    key: "maintenance",
    label: "Maintenance",
    purpose: "Work-order command-center read models, SLA/next-action helpers, and maintenance status grouping.",
    layers: ["query", "status"],
    primaryConsumers: ["landlord web", "vendor portal", "future mobile"]
  },
  {
    key: "marketplace",
    label: "Marketplace",
    purpose: "Public listing detail read models with address privacy, listing quality, photos, and public visibility rules.",
    layers: ["query", "policy"],
    primaryConsumers: ["public web", "future mobile", "partner APIs"]
  },
  {
    key: "payments",
    label: "Payments",
    purpose: "Landlord payment command center and renter payment center models with Stripe setup state and payment totals.",
    layers: ["query", "policy", "audit"],
    primaryConsumers: ["tenant portal", "landlord web", "future mobile"]
  },
  {
    key: "reports",
    label: "Reports",
    purpose: "Scoped report dashboards, drilldowns, and export response models.",
    layers: ["query", "audit"],
    primaryConsumers: ["landlord web", "admin web", "future scheduled jobs"]
  },
  {
    key: "unit-workspace",
    label: "Unit Workspace",
    purpose: "Canonical unit command-center read model for listing, leads, applications, lease, ledger, maintenance, documents, and timeline.",
    layers: ["query", "policy"],
    primaryConsumers: ["landlord web", "property manager shell", "future mobile"]
  }
] as const satisfies PlatformDomainRegistration[];

export function getPlatformDomain(key: string) {
  return platformDomainRegistry.find((domain) => domain.key === key) ?? null;
}

export type WorkflowReadinessStatus = "PROVEN" | "COVERED" | "BASIC" | "UNDERDEVELOPED";

export type WorkflowReadinessItem = {
  key: string;
  title: string;
  owner: string;
  status: WorkflowReadinessStatus;
  score: number;
  userPromise: string;
  provenBy: string[];
  mainRoutes: string[];
  knownGaps: string[];
  nextBestUpdate: string;
};

export const workflowReadinessItems: WorkflowReadinessItem[] = [
  {
    key: "public-discovery",
    title: "Public Discovery to Inquiry",
    owner: "Marketplace / Leasing",
    status: "PROVEN",
    score: 92,
    userPromise: "A renter can find an available home, inspect details, and submit an inquiry without an account.",
    provenBy: ["workflow-matrix.spec.ts", "seed-unit-101 available marketplace unit", "lead anti-spam action path"],
    mainRoutes: ["/marketplace", "/marketplace/[unitId]", "/signup"],
    knownGaps: ["Saved searches are still mostly a product surface, not a complete notification loop."],
    nextBestUpdate: "Add saved-search alerts and landlord response SLA tracking."
  },
  {
    key: "applicant-packet",
    title: "Applicant Housing Packet",
    owner: "Applicant Portal",
    status: "PROVEN",
    score: 88,
    userPromise: "An applicant can maintain a renter profile, track applications, upload documents, review leases, and see money/home tools.",
    provenBy: ["workflow-matrix.spec.ts", "seed-application-jane-doe", "seed-lease-packet-jane-doe"],
    mainRoutes: ["/applicant", "/applicant/profile", "/applicant/applications", "/applicant/documents", "/applicant/leases", "/applicant/home-tools"],
    knownGaps: ["Profile completeness still needs better guided remediation and more inline validation."],
    nextBestUpdate: "Create a guided applicant packet checklist with contextual fixes."
  },
  {
    key: "landlord-rental-ops",
    title: "Landlord Rental Operations",
    owner: "Landlord Portal",
    status: "COVERED",
    score: 82,
    userPromise: "A landlord can create listings, manage unit detail, review tenant context, and navigate the work queue.",
    provenBy: ["workflow-matrix.spec.ts", "seed-unit-102-tenant", "landlord-unit-workflow verifier"],
    mainRoutes: ["/landlord", "/landlord/rentals", "/landlord/rentals/new", "/landlord/rentals/[id]", "/landlord/tasks"],
    knownGaps: ["Bulk portfolio management and small-landlord quick create are separate experiences that need consolidation."],
    nextBestUpdate: "Unify property/unit creation into a single adaptive rental wizard."
  },
  {
    key: "tenant-maintenance",
    title: "Tenant Maintenance Loop",
    owner: "Maintenance",
    status: "PROVEN",
    score: 90,
    userPromise: "A tenant can submit a repair, the landlord sees it, and the conversation stays tied to the request.",
    provenBy: ["workflow-matrix.spec.ts", "seed-maintenance-leak-102", "seed-thread-maintenance-102", "seed-task-maintenance-102"],
    mainRoutes: ["/applicant/maintenance", "/landlord/maintenance", "/admin/maintenance", "/landlord/inbox"],
    knownGaps: ["Vendor dispatch, parts inventory, and repair closeout evidence need a richer field workflow."],
    nextBestUpdate: "Add maintenance dispatch boards with vendor assignment and closeout photos."
  },
  {
    key: "messaging",
    title: "Messaging and Universal Inbox",
    owner: "Communication",
    status: "COVERED",
    score: 78,
    userPromise: "Applicants, tenants, landlords, and staff can find thread context from their workspace.",
    provenBy: ["workflow-matrix.spec.ts", "messaging update verifier", "operational coherence verifier"],
    mainRoutes: ["/applicant/inbox", "/landlord/inbox", "/admin/inbox"],
    knownGaps: ["The interface still needs richer texting ergonomics, quick replies, assignment ownership, and SLA states."],
    nextBestUpdate: "Upgrade messaging into a true universal inbox with ownership, escalation, and linked records."
  },
  {
    key: "lease-signature",
    title: "Lease and E-Signature",
    owner: "Leasing",
    status: "COVERED",
    score: 84,
    userPromise: "Lease packets can be generated, previewed, routed, and backed by signature evidence.",
    provenBy: ["esignature verifier", "seed-lease-packet-jane-doe", "signature notification seed"],
    mainRoutes: ["/admin/leases", "/landlord/leases", "/applicant/leases", "/admin/lease-templates"],
    knownGaps: ["Clause management and renewal workflows are still more basic than the signature evidence layer."],
    nextBestUpdate: "Add lease clause library, renewal decision queue, and side-by-side lease diffing."
  },
  {
    key: "financial-operations",
    title: "Financial Operations and Stripe",
    owner: "Financial",
    status: "COVERED",
    score: 80,
    userPromise: "Ledgers, payments, Stripe setup, scheduled payments, autopay, and recovery surfaces are wired.",
    provenBy: ["workflow-matrix.spec.ts", "payment-method verification guards", "enterprise finance records"],
    mainRoutes: ["/admin/ledger", "/landlord/ledger", "/landlord/payments", "/applicant/payments", "/admin/reports"],
    knownGaps: ["Live Stripe edge cases need webhook replay coverage and stronger payout reconciliation dashboards."],
    nextBestUpdate: "Create a Stripe operations console for webhooks, payouts, disputes, and reconciliation."
  },
  {
    key: "admin-governance",
    title: "Admin Governance and Data Operations",
    owner: "Administration",
    status: "PROVEN",
    score: 86,
    userPromise: "Admins can review access, inspect operations, export/import data, review reports, and monitor security.",
    provenBy: ["workflow-matrix.spec.ts", "clean-install verifier", "routes checker"],
    mainRoutes: ["/admin/users", "/admin/operations", "/admin/backups", "/admin/reports", "/admin/security"],
    knownGaps: ["Governance is broad but needs stronger release readiness and workflow maturity visibility."],
    nextBestUpdate: "Ship this readiness center and make every major update add a maturity signal."
  },
  {
    key: "vendor-maintenance-ecosystem",
    title: "Vendor and Maintenance Ecosystem",
    owner: "Vendor Portal",
    status: "BASIC",
    score: 62,
    userPromise: "Vendors can be represented in the system, but the hands-on dispatch-to-invoice path is still early.",
    provenBy: ["vendor invitation verifier", "maintenance inventory verifier"],
    mainRoutes: ["/admin/vendors", "/admin/inventory", "/admin/maintenance"],
    knownGaps: ["Vendor portal workflows need acceptance, scheduling, work logs, invoice approval, and payout testing."],
    nextBestUpdate: "Build the vendor dispatch-to-payout workflow end to end."
  },
  {
    key: "mobile-field-work",
    title: "Mobile Field Work",
    owner: "Mobile UX",
    status: "UNDERDEVELOPED",
    score: 48,
    userPromise: "The platform is responsive, but inspectors, maintenance staff, and small landlords need faster field tools.",
    provenBy: ["mobile smoke check", "responsive dashboard shell"],
    mainRoutes: ["/landlord", "/admin/inspections", "/applicant/maintenance"],
    knownGaps: ["Offline tolerance, photo-first task completion, mobile table density, and sticky quick actions need focused work."],
    nextBestUpdate: "Create mobile field mode for inspections, maintenance, and landlord quick actions."
  }
];

export function getWorkflowReadinessSummary() {
  const total = workflowReadinessItems.length;
  const averageScore = Math.round(workflowReadinessItems.reduce((sum, item) => sum + item.score, 0) / total);
  const proven = workflowReadinessItems.filter((item) => item.status === "PROVEN").length;
  const covered = workflowReadinessItems.filter((item) => item.status === "COVERED").length;
  const basicOrBelow = workflowReadinessItems.filter((item) => item.status === "BASIC" || item.status === "UNDERDEVELOPED").length;
  const nextUpdates = workflowReadinessItems
    .filter((item) => item.status === "BASIC" || item.status === "UNDERDEVELOPED")
    .concat(workflowReadinessItems.filter((item) => item.status === "COVERED"))
    .slice(0, 5);

  return {
    total,
    averageScore,
    proven,
    covered,
    basicOrBelow,
    nextUpdates
  };
}

export function workflowStatusTone(status: WorkflowReadinessStatus) {
  if (status === "PROVEN") return "success";
  if (status === "COVERED") return "default";
  if (status === "BASIC") return "warning";
  return "danger";
}

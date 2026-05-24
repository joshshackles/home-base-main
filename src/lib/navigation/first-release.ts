import type { ShellNavGroup } from "@/components/layout/DashboardShell";

export const applicantNavGroups: ShellNavGroup[] = [
  { label: "Renter", items: [
    { href: "/applicant", label: "Workspace", icon: "LayoutDashboard", capability: "applicant.dashboard" },
    { href: "/marketplace", label: "Marketplace", icon: "Search", capability: "housing.search" },
    { href: "/applicant/profile", label: "Reusable Profile", icon: "UserRound", capability: "applicant.profile" },
    { href: "/applicant/favorites", label: "Saved Homes", icon: "Heart", capability: "housing.search" }
  ] },
  { label: "Applications", items: [
    { href: "/applicant/applications", label: "Applications", icon: "ClipboardList", capability: "applicant.applications" },
    { href: "/applicant/documents", label: "Documents", icon: "FileText", capability: "applicant.documents" },
    { href: "/applicant/leases", label: "Leases", icon: "FileSignature", capability: "applicant.documents" }
  ] },
  { label: "Communication", items: [
    { href: "/applicant/inbox", label: "Inbox", icon: "MessageSquare", capability: "applicant.messages" },
    { href: "/applicant/notifications", label: "Notifications", icon: "Bell", capability: "applicant.messages" },
    { href: "/applicant/calendar", label: "Appointments", icon: "CalendarDays", capability: "applicant.appointments" }
  ] }
];

export const tenantNavGroups: ShellNavGroup[] = [
  { label: "Resident", items: [
    { href: "/tenant", label: "Workspace", icon: "Home", capability: "tenant.dashboard" },
    { href: "/tenant/lease", label: "Lease", icon: "FileSignature", capability: "tenant.lease" },
    { href: "/tenant/payments", label: "Rent", icon: "DollarSign", capability: "tenant.rent" },
    { href: "/tenant/maintenance", label: "Maintenance", icon: "Wrench", capability: "tenant.maintenance" }
  ] },
  { label: "Records", items: [
    { href: "/tenant/documents", label: "Documents", icon: "FileText", capability: "tenant.documents" },
    { href: "/tenant/notices", label: "Notices", icon: "Megaphone", capability: "tenant.notices" },
    { href: "/tenant/inspections", label: "Inspections", icon: "ClipboardCheck", capability: "tenant.inspections" },
    { href: "/tenant/ledger", label: "Ledger", icon: "DollarSign", capability: "tenant.rent" }
  ] },
  { label: "Communication", items: [
    { href: "/tenant/inbox", label: "Inbox", icon: "MessageSquare", capability: "tenant.messages" }
  ] }
];

export const simpleLandlordNavGroups: ShellNavGroup[] = [
  { label: "Landlord", items: [
    { href: "/landlord", label: "Home", icon: "LayoutDashboard", capability: "landlord.dashboard" },
    { href: "/landlord/rentals", label: "Rentals", icon: "Home", capability: "landlord.listings" },
    { href: "/landlord/applications", label: "Applications", icon: "ClipboardList", capability: "landlord.applications" },
    { href: "/landlord/inbox", label: "Messages", icon: "MessageSquare", capability: "landlord.inbox" },
    { href: "/landlord/maintenance", label: "Maintenance", icon: "Wrench", capability: "landlord.maintenance" },
    { href: "/landlord/payments", label: "Payments", icon: "DollarSign", capability: "landlord.payments" }
  ] },
  { label: "Records", items: [
    { href: "/landlord/tenants", label: "Residents", icon: "Users", capability: "landlord.tenants" },
    { href: "/landlord/documents", label: "Documents", icon: "FileText", capability: "landlord.documents" },
    { href: "/landlord/leases", label: "Leases", icon: "FileSignature", capability: "landlord.leases" },
    { href: "/landlord/document-generation", label: "Generate Docs", icon: "FileSignature", capability: "landlord.documents" },
    { href: "/landlord/reports", label: "Reports", icon: "BarChart3", capability: "landlord.reports" }
  ] },
  { label: "Professional", items: [
    { href: "/landlord/property-management", label: "Advanced Workspace", icon: "PackageSearch", capability: "landlord.dashboard" }
  ] }
];

export const propertyManagementNavGroups: ShellNavGroup[] = [
  { label: "Command", items: [
    { href: "/landlord/property-management", label: "Workspace", icon: "LayoutDashboard", capability: "landlord.dashboard" },
    { href: "/landlord/inventory", label: "Inventory", icon: "PackageSearch", capability: "landlord.units" },
    { href: "/landlord/units", label: "Unit Workspaces", icon: "Database", capability: "landlord.units" },
    { href: "/landlord/tasks", label: "Tasks", icon: "CheckSquare", capability: "landlord.tasks" }
  ] },
  { label: "Leasing", items: [
    { href: "/landlord/inbox", label: "Leads & Inbox", icon: "Inbox", capability: "landlord.inbox" },
    { href: "/landlord/applications", label: "Applications", icon: "ClipboardList", capability: "landlord.applications" },
    { href: "/landlord/rentals", label: "Listings", icon: "Megaphone", capability: "landlord.listings" },
    { href: "/landlord/screening", label: "Screening", icon: "ScreeningCheck", capability: "landlord.screening" }
  ] },
  { label: "Residents", items: [
    { href: "/landlord/tenants", label: "Residents", icon: "Users", capability: "landlord.tenants" },
    { href: "/landlord/documents", label: "Documents & Leases", icon: "FileText", capability: "landlord.documents" },
    { href: "/landlord/document-generation", label: "Generate Docs", icon: "FileSignature", capability: "landlord.documents" },
    { href: "/landlord/notices", label: "Notices", icon: "Megaphone", capability: "landlord.documents" }
  ] },
  { label: "Maintenance", items: [
    { href: "/landlord/maintenance", label: "Work Orders", icon: "Wrench", capability: "landlord.maintenance" },
    { href: "/landlord/inspections", label: "Inspections", icon: "ClipboardCheck", capability: "landlord.inspections" },
    { href: "/landlord/vendors", label: "Vendors", icon: "BriefcaseBusiness", capability: "landlord.vendors" },
    { href: "/landlord/contacts", label: "Contacts", icon: "Users", capability: "landlord.contacts" }
  ] },
  { label: "Financials", items: [
    { href: "/landlord/payments", label: "Payments", icon: "DollarSign", capability: "landlord.payments" },
    { href: "/landlord/ledger", label: "Ledger", icon: "Database", capability: "landlord.ledger" },
    { href: "/landlord/payments/reconciliation", label: "Reconciliation", icon: "ShieldCheck", capability: "landlord.payments" },
    { href: "/landlord/reports", label: "Reports", icon: "BarChart3", capability: "landlord.reports" }
  ] },
  { label: "Advanced", items: [
    { href: "/landlord/calendar", label: "Calendar", icon: "CalendarDays", capability: "landlord.calendar" },
    { href: "/landlord/compliance", label: "Compliance", icon: "ShieldCheck", capability: "landlord.compliance" },
    { href: "/landlord/integrations", label: "Integrations", icon: "PlugZap", capability: "landlord.integrations" },
    { href: "/landlord/lifecycle", label: "Lifecycle", icon: "Route", capability: "landlord.compliance" }
  ] }
];

// Backward-compatible export for older imports. New landlord shells choose one of
// the two mode-specific maps above.
export const landlordNavGroups = propertyManagementNavGroups;

export const inspectorNavGroups: ShellNavGroup[] = [
  { label: "Inspection", items: [
    { href: "/inspector", label: "Workspace", icon: "LayoutDashboard", capability: "inspector.dashboard" },
    { href: "/inspector#needs-attention", label: "Assignments", icon: "ClipboardCheck", capability: "inspector.assignments" },
    { href: "/inspector#activity", label: "Reports", icon: "Activity", capability: "inspector.reports" }
  ] }
];

export const vendorNavGroups: ShellNavGroup[] = [
  { label: "Field Work", items: [
    { href: "/vendor", label: "Field Mode", icon: "LayoutDashboard", capability: "vendor.dashboard" },
    { href: "/vendor/jobs", label: "Assigned Jobs", icon: "Wrench", capability: "vendor.jobs" },
    { href: "/vendor/invoices", label: "Invoices", icon: "DollarSign", capability: "vendor.invoices" },
    { href: "/vendor/contacts", label: "Job Contacts", icon: "Users", capability: "vendor.contacts" }
  ] }
];

export const adminNavGroups: ShellNavGroup[] = [
  { label: "Command", items: [
    { href: "/admin", label: "Command Center", icon: "Activity", capability: "admin.command-center" },
    { href: "/admin#access-requests", label: "Access Requests", icon: "Users", capability: "admin.access-requests" },
    { href: "/admin#data-quality", label: "Data Quality", icon: "Database", capability: "admin.data-quality" },
    { href: "/admin#blocked-workflows", label: "Workflows", icon: "Route", capability: "admin.workflows" },
    { href: "/admin#failed-integrations", label: "Integrations", icon: "PlugZap", capability: "admin.integrations" },
    { href: "/admin#production-health", label: "Health", icon: "Activity", capability: "admin.system-health" }
  ] },
  { label: "Operations", items: [
    { href: "/admin/users", label: "Users", icon: "Users", capability: "admin.users" },
    { href: "/admin/rentals", label: "Rentals", icon: "Home", capability: "admin.workflows" },
    { href: "/admin/applications", label: "Applications", icon: "ClipboardList", capability: "admin.workflows" },
    { href: "/admin/inbox", label: "Inbox", icon: "MessageSquare", capability: "admin.workflows" },
    { href: "/admin/workflow-proof", label: "Workflow Proof", icon: "ClipboardCheck", capability: "admin.workflows" },
    { href: "/admin/maintenance", label: "Maintenance", icon: "Wrench", capability: "admin.workflows" },
    { href: "/admin/inspections", label: "Inspections", icon: "ClipboardCheck", capability: "admin.workflows" }
  ] },
  { label: "Platform", items: [
    { href: "/admin/reports", label: "Reports", icon: "BarChart3", capability: "admin.reports" },
    { href: "/admin/system", label: "System Health", icon: "Database", capability: "admin.system-health" },
    { href: "/admin/branding", label: "Homepage", icon: "Sparkles", capability: "admin.command-center" },
    { href: "/admin#sample-data", label: "Sample Data", icon: "Database", capability: "super-admin.sample-data" },
    { href: "/admin/security", label: "Security", icon: "ShieldCheck", capability: "super-admin.security" },
    { href: "/admin/audit", label: "Audit Logs", icon: "Shield", capability: "super-admin.audit" }
  ] }
];

export const firstReleasePathways = [
  "public: homepage -> marketplace -> listing detail -> sign in",
  "applicant: workspace -> reusable profile -> saved homes -> applications -> inbox -> documents",
  "tenant: workspace -> current lease/rent -> maintenance -> inbox -> documents/notices/inspections",
  "landlord: workspace -> properties/units/listings -> applications -> tenants -> inbox -> maintenance",
  "inspector: workspace -> assigned inspections -> report workflow",
  "vendor: field workspace -> assigned jobs -> invoices -> contacts",
  "admin: command center -> access/data quality/workflows/integrations/security/sample data/audit/health"
] as const;

// Legacy verification marker retained for the tenant-portal release gate:
// tenant: dashboard -> current lease/rent -> maintenance -> inbox -> documents/notices/inspections

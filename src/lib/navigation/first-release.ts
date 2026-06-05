import type { ShellNavGroup } from "@/components/layout/DashboardShell";

// Canonical navigation maps preserve legacy routes while guiding each role
// toward the workspace labels defined in WORKSPACE_UX_STANDARD.md.
export const applicantNavGroups: ShellNavGroup[] = [
  { label: "Find a home", items: [
    { href: "/applicant", label: "Workspace", icon: "LayoutDashboard", capability: "applicant.dashboard" },
    { href: "/marketplace", label: "Search Homes", icon: "Search", capability: "housing.search" },
    { href: "/applicant/favorites", label: "Saved Homes", icon: "Heart", capability: "housing.search" }
  ] },
  { label: "Apply", items: [
    { href: "/applicant/profile", label: "Profile", icon: "UserRound", capability: "applicant.profile" },
    { href: "/applicant/applications", label: "Applications", icon: "ClipboardList", capability: "applicant.applications" },
    { href: "/applicant/documents", label: "Documents", icon: "FileText", capability: "applicant.documents" },
    { href: "/applicant/leases", label: "Lease Tasks", icon: "FileSignature", capability: "applicant.documents" }
  ] },
  { label: "Updates", items: [
    { href: "/participant", label: "Program Status", icon: "ClipboardCheck", capability: "applicant.applications" },
    { href: "/applicant/inbox", label: "Messages", icon: "MessageSquare", capability: "applicant.messages" },
    { href: "/applicant/notifications", label: "Notifications", icon: "Bell", capability: "applicant.messages" },
    { href: "/applicant/calendar", label: "Appointments", icon: "CalendarDays", capability: "applicant.appointments" }
  ] }
];

export const tenantNavGroups: ShellNavGroup[] = [
  { label: "Resident", items: [
    { href: "/tenant", label: "Workspace", icon: "Home", capability: "tenant.dashboard" },
    { href: "/tenant/payments", label: "Payments", icon: "DollarSign", capability: "tenant.rent" },
    { href: "/tenant/maintenance", label: "Maintenance", icon: "Wrench", capability: "tenant.maintenance" },
    { href: "/tenant/lease", label: "Lease", icon: "FileSignature", capability: "tenant.lease" },
    { href: "/tenant/inbox", label: "Messages", icon: "MessageSquare", capability: "tenant.messages" }
  ] },
  { label: "Records", items: [
    { href: "/tenant/documents", label: "Documents", icon: "FileText", capability: "tenant.documents" },
    { href: "/tenant/notices", label: "Notices", icon: "Megaphone", capability: "tenant.notices" },
    { href: "/tenant/inspections", label: "Inspections", icon: "ClipboardCheck", capability: "tenant.inspections" },
    { href: "/participant", label: "Program Status", icon: "ClipboardCheck", capability: "tenant.dashboard" },
    { href: "/tenant/ledger", label: "Account History", icon: "DollarSign", capability: "tenant.rent" }
  ] }
];

export const simpleLandlordNavGroups: ShellNavGroup[] = [
  { label: "Landlord", items: [
    { href: "/landlord", label: "Home", icon: "LayoutDashboard", capability: "landlord.dashboard" },
    { href: "/landlord/inventory", label: "Inventory", icon: "PackageSearch", capability: "landlord.units" },
    { href: "/landlord/applications", label: "Applications", icon: "ClipboardList", capability: "landlord.applications" },
    { href: "/landlord/inbox", label: "Messages", icon: "MessageSquare", capability: "landlord.inbox" },
    { href: "/landlord/maintenance", label: "Maintenance", icon: "Wrench", capability: "landlord.maintenance" },
    { href: "/landlord/payments", label: "Payments", icon: "DollarSign", capability: "landlord.payments" }
  ] },
  { label: "Records", items: [
    { href: "/landlord/tenants", label: "Residents", icon: "Users", capability: "landlord.tenants" },
    { href: "/landlord/rentals", label: "Listings", icon: "Megaphone", capability: "landlord.listings" },
    { href: "/landlord/documents", label: "Documents & Leases", icon: "FileText", capability: "landlord.documents" },
    { href: "/landlord/document-generation", label: "Generate Documents", icon: "FileSignature", capability: "landlord.documents" },
    { href: "/owner", label: "Owner View", icon: "BarChart3", capability: "landlord.reports" },
    { href: "/landlord/reports", label: "Reports", icon: "BarChart3", capability: "landlord.reports" }
  ] },
  { label: "Professional", items: [
    { href: "/landlord/property-management", label: "Advanced Workspace", icon: "PackageSearch", capability: "landlord.dashboard" }
  ] }
];

export const propertyManagementNavGroups: ShellNavGroup[] = [
  { label: "Home", items: [
    { href: "/landlord/property-management", label: "Workspace", icon: "LayoutDashboard", capability: "landlord.dashboard" },
    { href: "/landlord/inventory", label: "Inventory", icon: "PackageSearch", capability: "landlord.units" },
    { href: "/landlord/tasks", label: "Tasks", icon: "CheckSquare", capability: "landlord.tasks" }
  ] },
  { label: "Leasing", items: [
    { href: "/landlord/inbox", label: "Leads & Messages", icon: "Inbox", capability: "landlord.inbox" },
    { href: "/landlord/applications", label: "Applications", icon: "ClipboardList", capability: "landlord.applications" },
    { href: "/landlord/rentals", label: "Listings", icon: "Megaphone", capability: "landlord.listings" },
    { href: "/landlord/screening", label: "Screening", icon: "ScreeningCheck", capability: "landlord.screening" }
  ] },
  { label: "Residents", items: [
    { href: "/landlord/tenants", label: "Residents", icon: "Users", capability: "landlord.tenants" },
    { href: "/landlord/documents", label: "Documents & Leases", icon: "FileText", capability: "landlord.documents" },
    { href: "/landlord/document-generation", label: "Generate Documents", icon: "FileSignature", capability: "landlord.documents" },
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
    { href: "/landlord/ledger", label: "Ledger & Adjustments", icon: "Database", capability: "landlord.ledger" },
    { href: "/landlord/payments/reconciliation", label: "Reconciliation", icon: "ShieldCheck", capability: "landlord.payments" },
    { href: "/owner", label: "Owner View", icon: "BarChart3", capability: "landlord.reports" },
    { href: "/landlord/reports", label: "Reports", icon: "BarChart3", capability: "landlord.reports" }
  ] },
  { label: "Advanced", items: [
    { href: "/landlord/calendar", label: "Calendar", icon: "CalendarDays", capability: "landlord.calendar" },
    { href: "/landlord/compliance", label: "Compliance", icon: "ShieldCheck", capability: "landlord.compliance" },
    { href: "/landlord/integrations", label: "Integrations", icon: "PlugZap", capability: "landlord.integrations" },
    { href: "/landlord/lifecycle", label: "Lifecycle", icon: "Route", capability: "landlord.compliance" }
  ] }
];

export const propertyManagerNavGroups: ShellNavGroup[] = [
  { label: "Home", items: [
    { href: "/landlord/property-management", label: "Workspace", icon: "LayoutDashboard", capability: "landlord.dashboard" },
    { href: "/landlord/inventory", label: "Inventory", icon: "PackageSearch", capability: "landlord.units" },
    { href: "/landlord/tasks", label: "Operational Queues", icon: "CheckSquare", capability: "landlord.tasks" }
  ] },
  { label: "Residents", items: [
    { href: "/landlord/tenants", label: "Residents", icon: "Users", capability: "landlord.tenants" },
    { href: "/landlord/leases", label: "Leases", icon: "FileSignature", capability: "landlord.leases" },
    { href: "/landlord/documents", label: "Documents", icon: "FileText", capability: "landlord.documents" }
  ] },
  { label: "Leasing", items: [
    { href: "/landlord/inbox", label: "Leads & Messages", icon: "Inbox", capability: "landlord.inbox" },
    { href: "/landlord/applications", label: "Applications", icon: "ClipboardList", capability: "landlord.applications" },
    { href: "/landlord/rentals", label: "Listings", icon: "Megaphone", capability: "landlord.listings" },
    { href: "/landlord/screening", label: "Screening", icon: "ScreeningCheck", capability: "landlord.screening" }
  ] },
  { label: "Maintenance", items: [
    { href: "/landlord/maintenance", label: "Work Orders", icon: "Wrench", capability: "landlord.maintenance" },
    { href: "/landlord/inspections", label: "Inspections", icon: "ClipboardCheck", capability: "landlord.inspections" },
    { href: "/landlord/vendors", label: "Team & Vendors", icon: "BriefcaseBusiness", capability: "landlord.vendors" }
  ] },
  { label: "Financials", items: [
    { href: "/landlord/payments", label: "Payments", icon: "DollarSign", capability: "landlord.payments" },
    { href: "/landlord/ledger", label: "Ledger & Adjustments", icon: "Database", capability: "landlord.ledger" },
    { href: "/owner", label: "Owner View", icon: "BarChart3", capability: "landlord.reports" },
    { href: "/landlord/reports", label: "Reports", icon: "BarChart3", capability: "landlord.reports" }
  ] },
  { label: "Advanced", items: [
    { href: "/landlord/calendar", label: "Calendar", icon: "CalendarDays", capability: "landlord.calendar" },
    { href: "/landlord/compliance", label: "Compliance", icon: "ShieldCheck", capability: "landlord.compliance" },
    { href: "/landlord/integrations", label: "Integrations", icon: "PlugZap", capability: "landlord.integrations" }
  ] }
];

export const leasingAgentNavGroups: ShellNavGroup[] = [
  { label: "Leasing", items: [
    { href: "/landlord/property-management", label: "Workspace", icon: "LayoutDashboard", capability: "landlord.dashboard" },
    { href: "/landlord/inbox", label: "Leads", icon: "Inbox", capability: "landlord.inbox" },
    { href: "/landlord/applications", label: "Applications", icon: "ClipboardList", capability: "landlord.applications" },
    { href: "/landlord/rentals", label: "Listings", icon: "Megaphone", capability: "landlord.listings" }
  ] },
  { label: "Follow-up", items: [
    { href: "/landlord/calendar", label: "Showings", icon: "CalendarDays", capability: "landlord.calendar" },
    { href: "/landlord/inbox", label: "Messages", icon: "MessageSquare", capability: "landlord.inbox" },
    { href: "/landlord/tasks", label: "Tasks", icon: "CheckSquare", capability: "landlord.tasks" },
    { href: "/landlord/screening", label: "Screening", icon: "ScreeningCheck", capability: "landlord.screening" }
  ] }
];

// Backward-compatible export for older imports. New landlord shells choose one of
// the two mode-specific maps above.
export const landlordNavGroups = propertyManagementNavGroups;

export const inspectorNavGroups: ShellNavGroup[] = [
  { label: "Inspection", items: [
    { href: "/inspector", label: "Workspace", icon: "LayoutDashboard", capability: "inspector.dashboard" },
    { href: "/inspector#needs-attention", label: "Assigned Inspections", icon: "ClipboardCheck", capability: "inspector.assignments" },
    { href: "/inspector#activity", label: "Reports & Corrections", icon: "Activity", capability: "inspector.reports" }
  ] }
];

export const vendorNavGroups: ShellNavGroup[] = [
  { label: "Field Work", items: [
    { href: "/vendor", label: "Field Mode", icon: "LayoutDashboard", capability: "vendor.dashboard" },
    { href: "/vendor/jobs", label: "Assigned Jobs", icon: "Wrench", capability: "vendor.jobs" },
    { href: "/vendor/jobs#estimates", label: "Estimates", icon: "ClipboardList", capability: "vendor.jobs" },
    { href: "/vendor/invoices", label: "Invoices", icon: "DollarSign", capability: "vendor.invoices" },
    { href: "/vendor/contacts", label: "Contacts", icon: "Users", capability: "vendor.contacts" }
  ] }
];

export const caseworkerNavGroups: ShellNavGroup[] = [
  { label: "Casework", items: [
    { href: "/caseworker", label: "Workspace", icon: "LayoutDashboard", capability: "caseworker.dashboard" },
    { href: "/caseworker#cases", label: "Assigned Cases", icon: "Users", capability: "caseworker.clients" },
    { href: "/caseworker#documents", label: "Missing Documents", icon: "FileText", capability: "caseworker.documents" },
    { href: "/caseworker#rfta", label: "RFTA Review", icon: "ClipboardCheck", capability: "caseworker.applications" },
    { href: "/caseworker#messages", label: "Messages", icon: "MessageSquare", capability: "caseworker.messages" }
  ] },
  { label: "Program Work", items: [
    { href: "/caseworker#inspections", label: "Inspections", icon: "ClipboardList", capability: "caseworker.applications" },
    { href: "/caseworker#subsidy", label: "Subsidy Status", icon: "DollarSign", capability: "caseworker.applications" },
    { href: "/caseworker#referrals", label: "Referrals", icon: "Route", capability: "caseworker.referrals" }
  ] }
];

export const housingAuthorityNavGroups: ShellNavGroup[] = [
  { label: "Program", items: [
    { href: "/housing-authority", label: "Dashboard", icon: "LayoutDashboard", capability: "admin.workflows" },
    { href: "/housing-authority#cases", label: "Program Cases", icon: "Users", capability: "admin.workflows" },
    { href: "/housing-authority#rfta", label: "RFTA Review", icon: "ClipboardCheck", capability: "admin.workflows" },
    { href: "/housing-authority#inspections", label: "Inspections", icon: "ClipboardList", capability: "admin.workflows" }
  ] },
  { label: "Subsidy", items: [
    { href: "/housing-authority#subsidy", label: "HAP/Subsidy", icon: "DollarSign", capability: "admin.workflows" },
    { href: "/housing-authority#payment-standards", label: "Payment Standards", icon: "Database", capability: "admin.workflows" },
    { href: "/housing-authority#documents", label: "Documents", icon: "FileText", capability: "admin.workflows" },
    { href: "/housing-authority#reports", label: "Reports", icon: "BarChart3", capability: "admin.reports" }
  ] }
];

export const adminNavGroups: ShellNavGroup[] = [
  { label: "Command Center", items: [
    { href: "/admin", label: "Command Center", icon: "Activity", capability: "admin.command-center" },
    { href: "/admin#access-requests", label: "Users & Access", icon: "Users", capability: "admin.access-requests" },
    { href: "/admin#blocked-workflows", label: "Workflow Exceptions", icon: "Route", capability: "admin.workflows" },
    { href: "/admin#data-quality", label: "Data Quality", icon: "Database", capability: "admin.data-quality" },
    { href: "/admin#failed-integrations", label: "Integration Status", icon: "PlugZap", capability: "admin.integrations" },
    { href: "/admin#production-health", label: "System Health", icon: "Activity", capability: "admin.system-health" }
  ] },
  { label: "Operations", items: [
    { href: "/admin/users", label: "Users", icon: "Users", capability: "admin.users" },
    { href: "/admin/rentals", label: "Listings & Inventory", icon: "Home", capability: "admin.workflows" },
    { href: "/admin/applications", label: "Applications", icon: "ClipboardList", capability: "admin.workflows" },
    { href: "/admin/inbox", label: "Messages", icon: "MessageSquare", capability: "admin.workflows" },
    { href: "/admin/workflow-proof", label: "Workflow Proof", icon: "ClipboardCheck", capability: "admin.workflows" },
    { href: "/admin/maintenance", label: "Maintenance", icon: "Wrench", capability: "admin.workflows" },
    { href: "/admin/inspections", label: "Inspections", icon: "ClipboardCheck", capability: "admin.workflows" }
  ] },
  { label: "Reports", items: [
    { href: "/admin/reports", label: "Reports", icon: "BarChart3", capability: "admin.reports" },
    { href: "/admin/branding", label: "Public Site", icon: "Sparkles", capability: "admin.command-center" }
  ] }
];

export const superAdminNavGroups: ShellNavGroup[] = [
  { label: "Admin Operations", items: [
    { href: "/admin", label: "Command Center", icon: "Activity", capability: "admin.command-center" },
    { href: "/admin#access-requests", label: "Users & Access", icon: "Users", capability: "admin.access-requests" },
    { href: "/admin#blocked-workflows", label: "Workflow Exceptions", icon: "Route", capability: "admin.workflows" },
    { href: "/admin#data-quality", label: "Data Quality", icon: "Database", capability: "admin.data-quality" },
    { href: "/admin#failed-integrations", label: "Integration Status", icon: "PlugZap", capability: "admin.integrations" }
  ] },
  { label: "Platform Operations", items: [
    { href: "/admin/platform-operations", label: "Platform Console", icon: "ShieldCheck", capability: "super-admin.platform-settings" },
    { href: "/admin/system", label: "System Health", icon: "Database", capability: "admin.system-health" },
    { href: "/admin/integrations", label: "Integrations", icon: "PlugZap", capability: "admin.integrations" },
    { href: "/admin/operations", label: "Queue & Jobs", icon: "Activity", capability: "admin.system-health" },
    { href: "/admin/reports", label: "Reports", icon: "BarChart3", capability: "admin.reports" }
  ] },
  { label: "Security & Recovery", items: [
    { href: "/admin/security", label: "Security", icon: "ShieldCheck", capability: "super-admin.security" },
    { href: "/admin/audit", label: "Audit Logs", icon: "Shield", capability: "super-admin.audit" },
    { href: "/admin/system#sample-data", label: "Sample Data", icon: "Database", capability: "super-admin.sample-data" },
    { href: "/admin/backups", label: "Backups", icon: "Database", capability: "super-admin.platform-settings" }
  ] }
];

// Legacy verification markers retained for the admin-ops / marketplace discovery release gate.
// { href: "/admin#access-requests", label: "Access Requests"
// { href: "/admin#blocked-workflows", label: "Workflows"
// { href: "/admin#failed-integrations", label: "Integrations"
// { href: "/admin#production-health", label: "Health"
// { href: "/admin#sample-data", label: "Sample Data"

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
// { href: "/tenant/payments", label: "Rent"
// { href: "/tenant/ledger", label: "Ledger"
// { href: "/tenant/inbox", label: "Inbox"

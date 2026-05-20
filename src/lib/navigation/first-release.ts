import type { ShellNavGroup } from "@/components/layout/DashboardShell";

export const applicantNavGroups: ShellNavGroup[] = [
  { label: "Renter", items: [
    { href: "/applicant", label: "Dashboard", icon: "LayoutDashboard", capability: "applicant.dashboard" },
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
    { href: "/tenant", label: "Dashboard", icon: "Home", capability: "tenant.dashboard" },
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

export const landlordNavGroups: ShellNavGroup[] = [
  { label: "Portfolio", items: [
    { href: "/landlord", label: "Dashboard", icon: "LayoutDashboard", capability: "landlord.dashboard" },
    { href: "/landlord/properties", label: "Properties", icon: "Home", capability: "landlord.properties" },
    { href: "/landlord/units", label: "Units", icon: "Database", capability: "landlord.units" },
    { href: "/landlord/rentals", label: "Listings", icon: "Megaphone", capability: "landlord.listings" },
    { href: "/landlord/tenants", label: "Tenants", icon: "Users", capability: "landlord.tenants" }
  ] },
  { label: "Leasing", items: [
    { href: "/landlord/applications", label: "Applications", icon: "ClipboardList", capability: "landlord.applications" },
    { href: "/landlord/inbox", label: "Inbox", icon: "MessageSquare", capability: "landlord.inbox" },
    { href: "/landlord/leases", label: "Leases", icon: "FileSignature", capability: "landlord.leases" },
    { href: "/landlord/documents", label: "Documents", icon: "FileText", capability: "landlord.documents" }
  ] },
  { label: "Operations", items: [
    { href: "/landlord/maintenance", label: "Maintenance", icon: "Wrench", capability: "landlord.maintenance" },
    { href: "/landlord/inspections", label: "Inspections", icon: "ClipboardCheck", capability: "landlord.inspections" },
    { href: "/landlord/vendors", label: "Vendors", icon: "BriefcaseBusiness", capability: "landlord.vendors" },
    { href: "/landlord/reports", label: "Reports", icon: "BarChart3", capability: "landlord.reports" }
  ] }
];

export const inspectorNavGroups: ShellNavGroup[] = [
  { label: "Inspection", items: [
    { href: "/inspector", label: "Dashboard", icon: "LayoutDashboard", capability: "inspector.dashboard" },
    { href: "/inspector#needs-attention", label: "Assignments", icon: "ClipboardCheck", capability: "inspector.assignments" },
    { href: "/inspector#activity", label: "Reports", icon: "Activity", capability: "inspector.reports" }
  ] }
];

export const vendorNavGroups: ShellNavGroup[] = [
  { label: "Field Work", items: [
    { href: "/vendor", label: "Dashboard", icon: "LayoutDashboard", capability: "vendor.dashboard" },
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
  "applicant: dashboard -> reusable profile -> saved homes -> applications -> inbox -> documents",
  "tenant: dashboard -> current lease/rent -> maintenance -> inbox -> documents/notices/inspections",
  "landlord: dashboard -> properties/units/listings -> applications -> tenants -> inbox -> maintenance",
  "inspector: dashboard -> assigned inspections -> report workflow",
  "vendor: dashboard -> assigned jobs -> invoices -> contacts",
  "admin: command center -> access/data quality/workflows/integrations/security/sample data/audit/health"
] as const;

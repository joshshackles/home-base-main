import type { ShellNavGroup } from "@/components/layout/DashboardShell";

export const applicantNavGroups: ShellNavGroup[] = [
  { label: "Renter", items: [
    { href: "/dashboard", label: "Role Home", icon: "LayoutDashboard" },
    { href: "/applicant", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/marketplace", label: "Marketplace", icon: "Search" },
    { href: "/applicant/profile", label: "Reusable Profile", icon: "UserRound" },
    { href: "/applicant/favorites", label: "Saved Homes", icon: "Heart" }
  ] },
  { label: "Applications", items: [
    { href: "/applicant/applications", label: "Applications", icon: "ClipboardList" },
    { href: "/applicant/documents", label: "Documents", icon: "FileText" },
    { href: "/applicant/leases", label: "Leases", icon: "FileSignature" }
  ] },
  { label: "Communication", items: [
    { href: "/applicant/inbox", label: "Inbox", icon: "MessageSquare" },
    { href: "/applicant/notifications", label: "Notifications", icon: "Bell" },
    { href: "/applicant/calendar", label: "Calendar", icon: "CalendarDays" }
  ] }
];

export const tenantNavGroups: ShellNavGroup[] = [
  { label: "Resident", items: [
    { href: "/dashboard", label: "Role Home", icon: "LayoutDashboard" },
    { href: "/tenant", label: "Dashboard", icon: "Home" },
    { href: "/tenant/lease", label: "Lease", icon: "FileSignature" },
    { href: "/tenant/payments", label: "Rent", icon: "DollarSign" },
    { href: "/tenant/maintenance", label: "Maintenance", icon: "Wrench" }
  ] },
  { label: "Records", items: [
    { href: "/tenant/documents", label: "Documents", icon: "FileText" },
    { href: "/tenant/notices", label: "Notices", icon: "Megaphone" },
    { href: "/tenant/inspections", label: "Inspections", icon: "ClipboardCheck" },
    { href: "/tenant/ledger", label: "Ledger", icon: "DollarSign" }
  ] },
  { label: "Communication", items: [
    { href: "/tenant/inbox", label: "Inbox", icon: "MessageSquare" },
    { href: "/tenant/tasks", label: "Tasks", icon: "CheckSquare" },
    { href: "/tenant/calendar", label: "Calendar", icon: "CalendarDays" }
  ] }
];

export const landlordNavGroups: ShellNavGroup[] = [
  { label: "Portfolio", items: [
    { href: "/dashboard", label: "Role Home", icon: "LayoutDashboard" },
    { href: "/landlord", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/landlord/properties", label: "Properties", icon: "Home" },
    { href: "/landlord/units", label: "Units", icon: "Database" },
    { href: "/landlord/rentals", label: "Listings", icon: "Megaphone" },
    { href: "/landlord/tenants", label: "Tenants", icon: "Users" }
  ] },
  { label: "Leasing", items: [
    { href: "/landlord/applications", label: "Applications", icon: "ClipboardList" },
    { href: "/landlord/inbox", label: "Inbox", icon: "MessageSquare" },
    { href: "/landlord/leads", label: "Leads", icon: "Inbox" },
    { href: "/landlord/leases", label: "Leases", icon: "FileSignature" },
    { href: "/landlord/documents", label: "Documents", icon: "FileText" }
  ] },
  { label: "Operations", items: [
    { href: "/landlord/maintenance", label: "Maintenance", icon: "Wrench" },
    { href: "/landlord/inspections", label: "Inspections", icon: "ClipboardCheck" },
    { href: "/landlord/vendors", label: "Vendors", icon: "BriefcaseBusiness" },
    { href: "/landlord/calendar", label: "Calendar", icon: "CalendarDays" },
    { href: "/landlord/reports", label: "Reports", icon: "BarChart3" }
  ] }
];

export const inspectorNavGroups: ShellNavGroup[] = [
  { label: "Inspection", items: [
    { href: "/dashboard", label: "Role Home", icon: "LayoutDashboard" },
    { href: "/inspector", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/inspector#needs-attention", label: "Needs Attention", icon: "ClipboardCheck" },
    { href: "/inspector#activity", label: "Activity", icon: "Activity" }
  ] },
  { label: "Account", items: [
    { href: "/account/password", label: "Security", icon: "ShieldCheck" }
  ] }
];

export const vendorNavGroups: ShellNavGroup[] = [
  { label: "Field Work", items: [
    { href: "/dashboard", label: "Role Home", icon: "LayoutDashboard" },
    { href: "/vendor", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/vendor/jobs", label: "Assigned Jobs", icon: "Wrench" },
    { href: "/vendor/invoices", label: "Invoices", icon: "DollarSign" },
    { href: "/vendor/contacts", label: "Contacts", icon: "Users" }
  ] }
];

export const adminNavGroups: ShellNavGroup[] = [
  { label: "Command", items: [
    { href: "/dashboard", label: "Role Home", icon: "LayoutDashboard" },
    { href: "/admin", label: "Command Center", icon: "Activity" },
    { href: "/admin#access-requests", label: "Access Requests", icon: "Users" },
    { href: "/admin#data-quality", label: "Data Quality", icon: "Database" },
    { href: "/admin#blocked-workflows", label: "Workflows", icon: "Route" },
    { href: "/admin#failed-integrations", label: "Integrations", icon: "PlugZap" },
    { href: "/admin#production-health", label: "Health", icon: "Activity" }
  ] },
  { label: "Operations", items: [
    { href: "/admin/users", label: "Users", icon: "Users" },
    { href: "/admin/rentals", label: "Rentals", icon: "Home" },
    { href: "/admin/applications", label: "Applications", icon: "ClipboardList" },
    { href: "/admin/inbox", label: "Inbox", icon: "MessageSquare" },
    { href: "/admin/workflow-proof", label: "Workflow Proof", icon: "ClipboardCheck" },
    { href: "/admin/maintenance", label: "Maintenance", icon: "Wrench" },
    { href: "/admin/inspections", label: "Inspections", icon: "ClipboardCheck" }
  ] },
  { label: "Platform", items: [
    { href: "/admin#sample-data", label: "Sample Data", icon: "Database" },
    { href: "/admin/security", label: "Security", icon: "ShieldCheck" },
    { href: "/admin/audit", label: "Audit Logs", icon: "Shield" },
    { href: "/admin/reports", label: "Reports", icon: "BarChart3" },
    { href: "/admin/system", label: "System Health", icon: "Database" }
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

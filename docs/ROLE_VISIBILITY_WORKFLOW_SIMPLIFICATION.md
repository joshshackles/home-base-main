# Role Visibility and Workflow Simplification

HomeBase MLS now uses a minimum necessary interface rule: a user sees only the dashboard, navigation, tools, and actions needed for their normal workflow. The underlying services still exist for platform operations, but non-essential tools stay hidden from role-specific screens.

## Source of Truth

- `src/lib/role-capabilities.ts` defines the role capability map, workspace landing pages, visible capabilities, and hidden background services.
- `src/lib/role-capabilities.server.ts` loads approved account access and enforces workspace/capability access on the server.
- `src/lib/navigation/first-release.ts` annotates navigation items with capability keys.
- `DashboardShell` renders only the already-filtered navigation groups it receives.

## Role Workflows

### Applicant

Applicants see housing search, reusable profile, saved homes, applications, documents, messages, notifications, and appointments. Tenant rent, landlord portfolio, vendor, inspector, and admin tools stay hidden.

### Tenant

Tenants see the resident portal: dashboard, lease, rent, maintenance, documents, notices, inspections, ledger, and inbox. Applicant profile/application setup no longer appears in the tenant portal.

### Landlord / Property Manager

Landlords and approved property managers see properties, units, listings, applications, tenants, unified inbox, leases, documents, maintenance, inspections, vendors, and reports. Lead replies are intentionally consolidated behind the inbox instead of a separate primary navigation item.

### Case Manager / Agency User

Caseworker access is modeled separately from applicant access. The capability map reserves client support, application assistance, referrals, documents, messages, and status tracking without exposing landlord ownership, rent ledger administration, vendor payout operations, or platform security controls.

### Inspector

Inspectors see inspection dashboard, assignments, and report activity. Account/security links and unrelated operations tools are removed from primary inspection navigation.

### Vendor / Maintenance

Vendors and approved maintenance users see assigned jobs, invoices, and job contacts. Landlord ownership tools, applicant profile data, admin operations, and inspection authority stay hidden.

### Admin

Admins see operational tools: command center, users, access requests, data quality, workflows, integrations, reports, and system health. They do not automatically receive every role dashboard in the shared dashboard system.

### Super Admin / Platform Operator

Super admins are admins with approved `SUPER_USER` account access. They see admin operations plus security controls, audit logs, sample data controls, and platform-wide settings. Security and audit pages enforce this capability server-side.

## Server-Side Enforcement

Role layouts now use `requireWorkspaceAccess` instead of scattered role checks. This allows expanded access such as property manager, inspector, maintenance, vendor, and super user to work through approved account access while keeping direct URL access protected.

Sensitive super-admin routes use `requireCapability` so hidden navigation is backed by server-side authorization, not only UI filtering.

## Admin Background Access

This update does not delete background services. Admin and super-admin capabilities keep platform operations available from the admin surface while reducing clutter for applicants, tenants, landlords, inspectors, vendors, and caseworkers.

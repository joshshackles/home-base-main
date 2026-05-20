# Role-Based Dashboard System

Version: 4.36.0

## Purpose

HomeBase dashboards now resolve from the signed-in user's `UserRole`, approved account access requests, and server-scoped workflow data. The shared `/dashboard` page renders a role-specific operating surface while existing role routes continue to work.

## Architecture

- `src/lib/dashboard/role-config.ts` maps roles and approved `AccountAccessType` values to dashboard modules.
- `src/lib/dashboard/permissions.ts` loads approved and pending account access records for the signed-in user.
- `src/lib/dashboard/role-dashboard.ts` builds permission-scoped dashboard models for applicant, tenant, landlord, inspector, vendor, and admin workflows.
- `src/components/dashboard/RoleDashboard.tsx` renders the shared role dashboard shell.
- `src/components/dashboard/DashboardMetricCard.tsx`, `DashboardTaskList.tsx`, `DashboardToolGrid.tsx`, and `DashboardActivityFeed.tsx` provide reusable dashboard primitives.

## Server-Side Permission Rules

- Applicant data is scoped to `applicantUserId` or the signed-in user's email.
- Tenant data is scoped to the signed-in user's active occupancy, unit, payments, notices, inspections, documents, and maintenance requests.
- Landlord/property-manager data is scoped through owned properties or units assigned with `propertyManagerUserId`.
- Inspector data is scoped to `assignedToId`, except admins.
- Vendor data uses the existing vendor portal access guard and assigned vendor data.
- Admin data is system-wide and still requires admin role access.

## Routes

- `/dashboard` renders the best role-based dashboard for the current user.
- `/admin` uses the shared admin dashboard model.
- `/vendor` uses the shared vendor dashboard model.
- `/inspector` adds a protected inspector workflow dashboard.
- `/landlord` and `/applicant` keep their richer specialized dashboards while linking to `/dashboard`.

## Follow-Up Opportunities

- Add dedicated inspector subroutes for inspection lists and reports.
- Move the existing landlord and applicant specialty dashboards onto the shared model incrementally without losing their workflow depth.
- Add per-organization property-manager scoping once portfolio assignment records are formalized beyond approved access.

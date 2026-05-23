# HomeBase Workspace Language Standard

HomeBase should describe authenticated role areas as workspaces, not dashboards.

## Product Language

- Use **Workspace** for the primary authenticated landing area for a role.
- Use **Resident workspace**, **Renter workspace**, **Landlord workspace**, **Property Management workspace**, **Field workspace**, **Inspection workspace**, and **Operations workspace** for role shells.
- Use **dashboard** only for internal code names, analytics/reporting objects, legacy route compatibility, or third-party product terms such as a provider dashboard.
- Keep existing routes like `/dashboard`, `/landlord`, `/tenant`, and `/admin` stable for compatibility. The route can stay old while the user-facing language moves forward.

## Why

Dashboard implies passive viewing. Workspace implies the user can review, decide, message, upload, approve, schedule, pay, inspect, and resolve work from the same place.

## Implementation Notes

- `WorkspaceShell` is the preferred import for new role shells.
- `DashboardShell` remains exported as a compatibility alias for older imports and verification scripts.
- Data builders may keep internal names such as `buildDashboardForModule` until a later low-risk refactor, but the copy they return should say workspace.

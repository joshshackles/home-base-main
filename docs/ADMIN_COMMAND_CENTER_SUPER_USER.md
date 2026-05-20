# Admin Command Center & Super User

Version: 4.44.0

This update upgrades `/admin` into a platform operations command center and adds a true super-user access type through `AccountAccessType.SUPER_USER`.

## Super User Model

- `UserRole.ADMIN` remains the core platform admin role.
- `AccountAccessType.SUPER_USER` is an auditable elevated account type granted through approved `AccountAccessRequest` records.
- `HOMEBASE_SUPER_USER_EMAILS` or `SUPER_USER_EMAILS` can grant environment-configured super-user access without exposing secret values in the UI.
- Bootstrap safety: if no explicit approved super-user grant exists yet, active admins can temporarily act as super users so the first grant can be created and approved.
- After an explicit super-user grant exists, sensitive controls require that grant.

## Server-Side Guards

The new helper file `src/lib/admin/permissions.ts` provides:

- `requireAdmin()`
- `requireSuperUser()`
- `canAccessAdminCommandCenter()`
- `canManageSampleData()`
- `canViewSecurityAlerts()`
- `canManageSuperUserGrants()`
- `assertSuperUser()`

Elevated access review is enforced in `reviewAccountAccessAction`, so `ADMIN` and `SUPER_USER` requests cannot be approved by normal admins once super-user mode is established.

## Command Center Sections

The command center uses real platform data for:

- Pending access requests
- Data quality issues
- Failed integrations
- Blocked workflows
- Sample data controls
- Production health checks
- Operational alerts
- Security events
- Elevated users
- Recent audit activity
- Admin quick actions

## Sample Data Safety

The command center detects sample-like records by sample IDs and `@example.test` emails. Destructive cleanup is intentionally disabled until sample records are tagged consistently across every model.

## Follow-Up

- Add an admin-only UI to grant `SUPER_USER` access directly to an existing admin.
- Add durable integration failure logging for every webhook and scheduled job.
- Add safe, tagged sample data cleanup once every imported sample record has a trusted sample marker.
- Split data quality findings into dedicated review pages when the counts become large.

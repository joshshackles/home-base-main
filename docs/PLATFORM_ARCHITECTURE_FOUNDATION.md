# HomeBase MLS Platform Architecture Foundation

HomeBase MLS should be treated as a shared platform with multiple frontends, not as a collection of Next.js pages that own business logic.

## Target Shape

- One source of truth: Prisma schema and platform services.
- One permissions system: all queries and commands receive an actor and enforce access inside the service layer.
- One business rules engine: workflow/status/eligibility decisions live in backend services.
- One audit/history system: high-risk commands write audit and timeline evidence from the service layer.
- Multiple views: web, mobile, admin panels, vendor portals, public portals, APIs, dashboards, and future white-label shells call the same platform services.

## Service Boundary

New platform services should use the shared helpers in `src/lib/platform`.

Recommended folder pattern:

```text
src/lib/platform/<domain>/
  queries.ts
  commands.ts
  policy.ts
  status.ts
  audit.ts
  types.ts
  index.ts
```

Use `queries.ts` for read models and DTOs. Use `commands.ts` for mutations. Use `policy.ts` for permissions and business rules. Use `status.ts` for workflow/status mapping. Use `audit.ts` for domain-specific audit messages.

The public platform import surface is `@/lib/platform`. Frontends should import `platformContext` and read models from that one boundary instead of reaching directly into low-level Prisma helpers.

```ts
import { platformContext, getLandlordUnitWorkspaceModel } from "@/lib/platform";
```

`src/lib/platform/read-models.ts` re-exports migrated query/read-model services for web, future mobile, API routes, and scheduled jobs. `src/lib/platform/domain-registry.ts` documents the migrated domains and the platform layers they currently own.

Current migrated read-model domains:

- `applications`: landlord application review context.
- `documents`: lease/document center and signature packet summaries.
- `leads`: leasing CRM pipeline stages and metrics.
- `ledger`: scoped ledger entries, snapshots, and payment plans.
- `maintenance`: landlord maintenance command center.
- `marketplace`: public listing detail with address privacy and listing quality.
- `payments`: landlord payment operations and renter payment center.
- `reports`: scoped dashboards, drilldowns, and exports.
- `unit-workspace`: canonical unit command center.

## Frontend Rule

Next.js pages and components should mostly:

- render data
- collect user input
- call platform queries/commands
- show workflow state returned by services

They should not be the primary home for:

- listing approval logic
- application workflow rules
- ledger balance rules
- maintenance transition rules
- document visibility rules
- messaging permissions
- report scoping
- owner/client visibility rules
- RFTA/HAP/certification status rules

## Actor and Context

Every platform service should accept a `PlatformContext`.

```ts
const ctx = platformContext(user, { source: "web" });
const model = await getUnitWorkspace(ctx, { unitId });
```

This makes the same service callable from:

- Next.js server components
- server actions
- API routes
- cron jobs
- future React Native apps
- partner integrations

## Error Handling

Use `PlatformError` for expected service failures:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `CONFLICT`
- `INVARIANT_VIOLATION`
- `PROVIDER_UNAVAILABLE`

API routes can translate these into stable HTTP responses. Web pages can render appropriate empty/error states.

## Audit Standard

High-risk commands should write audit evidence from the service layer, not from individual pages. This includes:

- financial mutations
- application decisions
- document sharing/revocation
- message visibility changes
- impersonation-sensitive actions
- report exports
- API key and webhook changes
- provider setup changes
- maintenance/vendor invoice decisions
- RFTA/HAP/program changes

## Migration Priority

Move logic out of pages in this order:

1. Unit Workspace
2. Maintenance/work orders
3. Applications
4. Listings/marketplace
5. Ledger/payments
6. Documents/messages
7. Reports/admin operations

Each migration should preserve the current UI while replacing page-owned Prisma queries and business rules with platform service calls.

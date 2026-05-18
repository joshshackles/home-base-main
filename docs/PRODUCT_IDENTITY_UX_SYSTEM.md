# HomeBase Housing OS Product Identity

Version 3.5.0 starts the transition from feature-rich rental software to a premium housing operations platform.

## Brand Direction

- Product language: housing operations platform.
- Visual language: dense, calm, enterprise operating system.
- Brand mark: geometric HomeBase H mark with dark and light variants.
- Public and private surfaces share typography, spacing, color rules, and navigation behavior.

## Color Rules

- Primary background: `#0F172A`
- Primary surface: `#111827`
- Primary action blue: `#2563EB`
- Success/payments green: `#10B981`
- Warning amber: `#F59E0B`
- Critical red: `#EF4444`
- Structure slate and borders: `#334155`

Use blue for actions, green for payment/success, amber for warnings, red for critical states, and slate for structure.

## System Components

Shared primitives live in `src/components/ui/system/`:

- `AppCard`
- `MetricTile`
- `CompactTable`
- `StatusBadge`
- `SectionHeader`
- `ActionBar`
- `EmptyState`
- `ActivityTimeline`
- `DrawerPanel`
- `QuickActionButton`
- `DataGrid`
- `SystemTabs`
- `CommandPalette`

The dashboard shell lives in `src/components/layout/DashboardShell.tsx` and supplies grouped modules, persistent operational search, quick actions, mobile nav, and the command palette entry point.

## Density

The shell sets `data-density="compact"` by default. Global CSS variables support:

- comfortable
- compact
- ultra compact

Future user settings can persist density, sidebar mode, accent preference, radius, and compact table behavior.

## Query And DTO Foundation

New DTO folders prepare the codebase for module migration without pushing raw Prisma shapes into UI:

- `src/lib/dashboard/`
- `src/lib/financial/`
- `src/lib/messaging/`

## Migration Rule

New or touched dashboards should use the shell and system primitives first. Older pages can migrate incrementally as their workflows are updated.

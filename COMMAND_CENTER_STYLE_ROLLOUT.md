# HomeBase Command Center Style Rollout

The landlord workspace command-center page is now the visual baseline for authenticated product pages.

For the full cross-role workspace standard, role templates, canonical regions, audit criteria, and implementation rules, use `WORKSPACE_UX_STANDARD.md`. The code-level registry lives in `src/lib/workspace/workspace-ux-standard.ts`.

## Canonical Pattern

Use the shared primitives in `src/components/ui/CommandCenterPrimitives.tsx` for new or refreshed workspace pages:

- `CommandCenterHeader` for page identity, icon, eyebrow, description, and primary actions.
- `CommandCenterSurface` for large white workspace shells.
- `CommandCenterPanel` for focused workflow panels.
- `CommandCenterMetric` for compact operational metrics.
- `CommandCenterButton` for primary and secondary workspace actions.

## Visual Rules

- Use a light blue workspace background behind authenticated product surfaces.
- Keep major work areas white with soft borders and a subtle command-center shadow.
- Prefer 12px to 20px radius, not oversized decorative cards.
- Use dark navy/slate text, blue primary actions, and restrained status colors.
- Keep tabs compact, horizontal, and URL-state aware where possible.
- Put the most important workflow status and action above the fold.
- Use tables for comparison, cards for mobile, and panels for focused workflows.

## Current Broad Adopters

These shared headers now inherit the command-center look:

- `LandlordPageHeader`
- `AdminPageHeader`
- `ProductPageHeader`

This gives a broad first-pass visual alignment to landlord pages, admin pages, and system pages that already use those shared headers.

## Next Rollout Targets

1. Replace one-off local headers on tenant, applicant, owner, vendor, inspector, participant, and caseworker pages.
2. Replace older metric/card/table shells with `CommandCenterMetric` and `CommandCenterPanel`.
3. Convert high-traffic tab rows to URL-state command tabs.
4. Apply mobile card alternatives to table-heavy pages.
5. Remove duplicate local styling once usage is migrated.

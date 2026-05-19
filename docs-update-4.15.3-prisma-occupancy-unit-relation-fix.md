# v4.15.3 — Prisma Occupancy Unit Relation Fix

This patch fixes the Prisma schema validation error introduced by the relationship lifecycle/vendor invitation work.

## Fixed

- Added the missing opposite relation field on `Unit` for `Occupancy.unit`.
- Preserved the existing `Occupancy.unitId` relation and indexes.
- Bumped package version to `4.15.3`.

## Vercel error addressed

```txt
Error validating field `unit` in model `Occupancy`: The relation field `unit` on model `Occupancy` is missing an opposite relation field on the model `Unit`.
```

The `Unit` model now includes:

```prisma
occupancies Occupancy[]
```

# Update 12.7 — Transparent Operational Risk Score

This update replaces the opaque analytics Risk Index with a transparent Operational Risk score.

## What changed

- The analytics dashboard now labels the card as **Operational risk** instead of **Risk index**.
- Empty or quiet systems default to low/green because the score starts at 0.
- The score is calculated only from real workload and access/security signals.
- A visible calculation breakdown now shows each factor, count, point contribution, and cap.
- The old direct formula `securityEvents7 + pendingAccess + maintenanceOpen` was removed because it could make security-event volume alone look like a major operations risk.

## Score inputs

- Submitted applications: +2 each, capped at 20
- Open inspections: +3 each, capped at 15
- Open maintenance: +3 each, capped at 20
- Open message threads: +1 each, capped at 10
- Pending access requests: +5 each, capped at 15
- Security events in the last 7 days: +1 per five events, capped at 20

## Levels

- 0–14: Low
- 15–39: Moderate
- 40–74: Elevated
- 75–100: Critical

## Files changed

- `src/lib/admin-ops.ts`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/system/page.tsx`

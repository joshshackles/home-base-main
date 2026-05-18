# Update 12.6 — QuickBooks Setup Wizard

This update focuses the Integrations Control Center on making QuickBooks easier to add and operate.

## Added

- A dedicated QuickBooks setup wizard at the top of the Integrations Control Center.
- Guided fields for company name, realm ID, sandbox/production environment, invoice sync, payment sync, vendor bill sync, owner payout sync, and default account mappings.
- A QuickBooks environment-variable checklist that can be copied into Vercel.
- QuickBooks callback and webhook path guidance.
- A reusable `QUICKBOOKS_SETUP_PROFILE` in `src/lib/integrations-hub.ts` so QuickBooks setup details are not scattered through the UI.
- Admin and landlord server actions for creating QuickBooks connections directly.
- Automatic integration event logging when a QuickBooks setup record is created.

## Still intentionally not included

- OAuth token storage.
- Live QuickBooks API calls during page render.
- Automatic webhook registration.

Those should be added in a later QuickBooks OAuth/token-sync update so secrets and refresh tokens are handled safely.

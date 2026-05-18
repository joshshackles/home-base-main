# Update 12.5 — Integrations Control Center

This update upgrades the Integrations Hub from manual tracking into an operational readiness center.

## Added

- Provider readiness catalog for Stripe, Plaid, Twilio, SendGrid, Postmark, S3, R2, QuickBooks, Google Calendar, Google Maps, and screening providers.
- Environment-variable presence checks that never expose secret values.
- Webhook endpoint reference for webhook-capable providers.
- Diagnostic action that updates the connection status and writes an integration event.
- Secret-like key rejection in freeform config/payload JSON.
- Admin and landlord diagnostic actions wired into their integration pages.

## Important

The readiness diagnostic confirms configuration presence only. It does not call third-party APIs during page render and does not validate credential correctness with external providers.

# Update 12: Integrations Hub

Update 12 adds a functional Integrations Hub for operational provider management.

## Included providers

- Stripe payments
- Plaid bank/income connections
- Twilio SMS
- SendGrid and Postmark email
- S3 and R2 object storage
- QuickBooks accounting
- Google Calendar scheduling
- Google Maps/geocoding
- Applicant screening providers
- Other custom providers

## What changed

- Admin and landlord Integrations pages now use a dedicated `IntegrationsHubModule` component.
- Users can create provider connection records with status, account reference, config metadata, sync timestamps, and error notes.
- Users can update connection status after testing credentials, webhooks, sync jobs, or provider health.
- Users can log integration events for webhooks, imports, exports, SMS/email delivery, accounting syncs, calendar pushes, maps lookups, and screening activity.
- Landlord actions are scoped to the landlord portfolio and shared global provider records.
- Admin actions can manage all provider connection records.

## Security note

The hub stores non-secret configuration metadata only. Real credentials should remain in environment variables, encrypted storage, or the provider secret manager.
